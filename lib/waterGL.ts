/**
 * Moteur de rendu WebGL de la scène.
 *
 * Un simple quad plein écran échantillonne trois textures : le visuel à vide,
 * le visuel en eau, et la carte d'écoulement produite par
 * `scripts/build-flowmap.mjs`. Le shader substitue le second au premier au fur
 * et à mesure que le front progresse le long du réseau.
 *
 * WebGL brut plutôt qu'une bibliothèque : le besoin se limite à un quad et à
 * trois textures, et cela évite 150 Ko de dépendance pour la V1.
 */

const VERT = `#version 300 es
in vec2 aPos;
out vec2 vScreen;
void main() {
  vScreen = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAG = `#version 300 es
precision highp float;

in vec2 vScreen;
out vec4 fragColor;

uniform sampler2D uDry;
uniform sampler2D uWet;
uniform sampler2D uFlow;

uniform vec2  uCenter;   // centre de vue, en fractions d'image
uniform vec2  uHalf;     // demi-étendue visible, en fractions d'image
uniform float uProgress; // avancée du front, 0 à 1
uniform float uTime;
uniform vec2  uRes;      // taille du canvas, en pixels CSS
uniform float uFadePx;   // largeur du fondu blanc, en pixels écran

const float EDGE = 0.030;

void main() {
  // vScreen est originaire du bas (clip space WebGL). On le retourne pour
  // travailler dans le repere image, y = 0 en haut, comme view et la flowmap.
  vec2 ndc = vec2(vScreen.x, 1.0 - vScreen.y);
  vec2 uv = uCenter + (ndc - 0.5) * 2.0 * uHalf;

  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    fragColor = vec4(1.0, 1.0, 1.0, 1.0);
    return;
  }

  vec3 flow = texture(uFlow, uv).rgb;
  float along  = flow.r; // distance parcourue le long du réseau
  float window = flow.g; // fenêtre de mélange : conduites et bassins seuls

  // Frontière ondulante plutôt que rectiligne : deux sinusoïdes déphasées
  // suffisent à faire lire un front liquide et non un balayage mécanique.
  float wobble =
      0.010 * sin(uv.y * 85.0 + uTime * 1.9)
    + 0.006 * sin(uv.x * 130.0 - uTime * 2.7);

  float front = mix(-0.06, 1.04, uProgress);
  float fill  = smoothstep(front + EDGE, front - EDGE, along + wobble);
  float mask  = window * fill;

  // Léger déplacement de l'échantillon au voisinage du front : la réfraction
  // donne l'épaisseur de l'eau, sans laquelle la transition paraît plate.
  float near = exp(-pow((along - front) / EDGE, 2.0) * 1.6) * window;
  vec2 refract = vec2(
    sin(uv.y * 210.0 + uTime * 3.1),
    cos(uv.x * 190.0 - uTime * 2.4)
  ) * 0.0016 * near;

  vec3 dry = texture(uDry, uv).rgb;
  vec3 wet = texture(uWet, uv + refract).rgb;
  vec3 col = mix(dry, wet, mask);

  // Crête lumineuse sur le front, puis veines d'écoulement dans la partie
  // déjà remplie : c'est ce mouvement résiduel qui fait vivre la scène.
  col += vec3(0.20, 0.70, 0.95) * near * 0.42;
  float veins = mask * (0.5 + 0.5 * sin(along * 460.0 - uTime * 3.4));
  col += vec3(0.05, 0.30, 0.55) * veins * 0.085;

  // Fondu blanc collé aux bords du visuel (pas de l'écran), ~80 px.
  float fadeX = (uFadePx / max(uRes.x, 1.0)) * uHalf.x * 2.0;
  float fadeY = (uFadePx / max(uRes.y, 1.0)) * uHalf.y * 2.0;
  float ax = smoothstep(0.0, max(fadeX, 1.0e-5), min(uv.x, 1.0 - uv.x));
  float ay = smoothstep(0.0, max(fadeY, 1.0e-5), min(uv.y, 1.0 - uv.y));
  col = mix(vec3(1.0), col, ax * ay);

  fragColor = vec4(col, 1.0);
}`;

export type Uniforms = {
  centerX: number;
  centerY: number;
  halfX: number;
  halfY: number;
  progress: number;
  time: number;
  resX: number;
  resY: number;
  fadePx: number;
};

export type WaterRenderer = {
  resize: (w: number, h: number, dpr: number) => void;
  draw: (u: Uniforms) => void;
  dispose: () => void;
};

function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
  const sh = gl.createShader(type);
  if (!sh) throw new Error("shader non créé");
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    throw new Error(`compilation du shader : ${gl.getShaderInfoLog(sh)}`);
  }
  return sh;
}

function upload(gl: WebGL2RenderingContext, unit: number, img: TexImageSource): WebGLTexture {
  const tex = gl.createTexture();
  if (!tex) throw new Error("texture non créée");
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  // Mipmaps : la vue d'ensemble réduit un visuel de 4200 px à la largeur de la
  // fenêtre, un filtrage linéaire seul y produirait un fourmillement marqué.
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.generateMipmap(gl.TEXTURE_2D);
  return tex;
}

export function createRenderer(
  canvas: HTMLCanvasElement,
  images: { dry: TexImageSource; wet: TexImageSource; flow: TexImageSource },
): WaterRenderer {
  const gl = canvas.getContext("webgl2", {
    antialias: false,
    alpha: false,
    powerPreference: "high-performance",
  });
  if (!gl) throw new Error("WebGL2 indisponible");

  const program = gl.createProgram();
  if (!program) throw new Error("programme non créé");
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERT));
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(`édition de liens : ${gl.getProgramInfoLog(program)}`);
  }
  gl.useProgram(program);

  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(program, "aPos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const textures = [
    upload(gl, 0, images.dry),
    upload(gl, 1, images.wet),
    upload(gl, 2, images.flow),
  ];
  gl.uniform1i(gl.getUniformLocation(program, "uDry"), 0);
  gl.uniform1i(gl.getUniformLocation(program, "uWet"), 1);
  gl.uniform1i(gl.getUniformLocation(program, "uFlow"), 2);

  const uCenter = gl.getUniformLocation(program, "uCenter");
  const uHalf = gl.getUniformLocation(program, "uHalf");
  const uProgress = gl.getUniformLocation(program, "uProgress");
  const uTime = gl.getUniformLocation(program, "uTime");
  const uRes = gl.getUniformLocation(program, "uRes");
  const uFadePx = gl.getUniformLocation(program, "uFadePx");

  return {
    resize(w, h, dpr) {
      const pw = Math.round(w * dpr);
      const ph = Math.round(h * dpr);
      if (canvas.width === pw && canvas.height === ph) return;
      canvas.width = pw;
      canvas.height = ph;
      gl.viewport(0, 0, pw, ph);
    },
    draw(u) {
      gl.uniform2f(uCenter, u.centerX, u.centerY);
      gl.uniform2f(uHalf, u.halfX, u.halfY);
      gl.uniform1f(uProgress, u.progress);
      gl.uniform1f(uTime, u.time);
      gl.uniform2f(uRes, u.resX, u.resY);
      gl.uniform1f(uFadePx, u.fadePx);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    dispose() {
      textures.forEach((t) => gl.deleteTexture(t));
      gl.deleteBuffer(buffer);
      gl.deleteVertexArray(vao);
      gl.deleteProgram(program);
    },
  };
}

/** Choisit la résolution des visuels selon la fenêtre et la densité d'écran. */
export function pickWidth(): number {
  if (typeof window === "undefined") return 2800;
  const px = window.innerWidth * Math.min(window.devicePixelRatio || 1, 2);
  if (px > 2400) return 4200;
  if (px > 1500) return 2800;
  return 1800;
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`chargement impossible : ${src}`));
    img.src = src;
  });
}
