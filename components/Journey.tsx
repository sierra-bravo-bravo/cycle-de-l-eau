"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import Scene from "./Scene";
import DevCamera from "./DevCamera";
import { CHAPTERS } from "@/content/chapters";
import { cam, sceneTransform, toScreen, viewport } from "@/lib/camera";
import { clamp } from "@/lib/iso";

const LAST = CHAPTERS.length - 1;

/** Toutes les pastilles sont montées en permanence ; seules celles du chapitre
 *  actif sont visibles. Cela évite de remonter des nœuds à chaque transition et
 *  garde la boucle de positionnement sur un tableau stable. */
const SPOTS = CHAPTERS.flatMap((ch, chapter) =>
  ch.hotspots.map((spot) => ({ ...spot, chapter })),
);

export default function Journey() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const sceneRef = useRef<SVGGElement>(null);
  const spotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const activeRef = useRef(0);
  const [active, setActive] = useState(0);
  const [openSpot, setOpenSpot] = useState<number | null>(null);
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const lenis = new Lenis({ duration: reduced ? 0 : 1.1, smoothWheel: !reduced });
    lenisRef.current = lenis;
    lenis.on("scroll", ScrollTrigger.update);
    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    const resize = () => {
      viewport.w = window.innerWidth;
      viewport.h = window.innerHeight;
      viewport.fit = clamp(window.innerWidth / 1440, 0.55, 1.15);
      svgRef.current?.setAttribute(
        "viewBox",
        `${-viewport.w / 2} ${-viewport.h / 2} ${viewport.w} ${viewport.h}`,
      );
      ScrollTrigger.refresh();
    };
    resize();
    window.addEventListener("resize", resize);

    Object.assign(cam, CHAPTERS[0].focus);

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: wrapRef.current,
        start: "top top",
        end: "bottom bottom",
        scrub: reduced ? true : 0.7,
        onUpdate: (self) => {
          const i = clamp(Math.round(self.progress * LAST), 0, LAST);
          if (i !== activeRef.current) {
            activeRef.current = i;
            setActive(i);
            setOpenSpot(null);
          }
        },
      },
    });

    CHAPTERS.slice(1).forEach((ch) => {
      tl.to(cam, {
        u: ch.focus.u,
        v: ch.focus.v,
        zoom: ch.focus.zoom,
        duration: 1,
        ease: "power1.inOut",
      });
    });

    const render = () => {
      sceneRef.current?.setAttribute("transform", sceneTransform());
      for (let i = 0; i < SPOTS.length; i++) {
        const el = spotRefs.current[i];
        if (!el) continue;
        const s = SPOTS[i];
        const on = s.chapter === activeRef.current;
        if (!on) {
          if (el.dataset.on !== "0") el.dataset.on = "0";
          continue;
        }
        const p = toScreen(s.u, s.v, s.h);
        el.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0)`;
        if (el.dataset.on !== "1") el.dataset.on = "1";
      }
    };
    gsap.ticker.add(render);

    return () => {
      gsap.ticker.remove(render);
      gsap.ticker.remove(raf);
      window.removeEventListener("resize", resize);
      tl.scrollTrigger?.kill();
      tl.kill();
      lenis.destroy();
    };
  }, []);

  const goTo = (i: number) => {
    const wrap = wrapRef.current;
    if (!wrap || !lenisRef.current) return;
    const travel = wrap.offsetHeight - window.innerHeight;
    lenisRef.current.scrollTo(wrap.offsetTop + (i / LAST) * travel, { duration: 1.2 });
  };

  const chapter = CHAPTERS[active];
  const focusAttr = chapter.station ?? undefined;

  const dimCss = useMemo(
    () =>
      CHAPTERS.filter((c) => c.station)
        .map((c) => `.stage[data-focus="${c.station}"] .layer[data-part="${c.station}"]{opacity:1}`)
        .join(""),
    [],
  );

  return (
    <div ref={wrapRef} style={{ height: `${CHAPTERS.length * 100}vh` }}>
      <style>{dimCss}</style>
      <div className="stage" data-focus={focusAttr}>
        <svg ref={svgRef} className="canvas" aria-hidden="true">
          <Scene sceneRef={sceneRef} />
        </svg>

        {SPOTS.map((s, i) => (
          <div
            key={`${s.chapter}-${i}`}
            ref={(el) => {
              spotRefs.current[i] = el;
            }}
            className="spot"
            data-on="0"
          >
            <button
              type="button"
              className="spot-dot"
              aria-label={s.title}
              aria-expanded={openSpot === i}
              onClick={() => setOpenSpot(openSpot === i ? null : i)}
            >
              <span />
            </button>
            <div className="spot-card" data-open={openSpot === i ? "1" : "0"}>
              <p className="spot-title">{s.title}</p>
              <p className="spot-detail">{s.detail}</p>
            </div>
          </div>
        ))}

        <header className="brand">
          <span className="mark" aria-hidden="true" />
          <span>SOGEA</span>
          <span className="brand-sep" />
          <span className="muted">Cycle de l&apos;eau</span>
        </header>

        <nav className="rail" aria-label="Étapes du cycle">
          {CHAPTERS.map((c, i) => (
            <button
              key={c.id}
              type="button"
              onClick={() => goTo(i)}
              data-on={i === active ? "1" : "0"}
              aria-current={i === active ? "step" : undefined}
            >
              <span className="rail-idx">{c.index}</span>
              <span className="rail-bar" />
              <span className="rail-label">{c.label}</span>
            </button>
          ))}
        </nav>

        <div className="readout" key={chapter.id}>
          <p className="readout-label">{chapter.label}</p>
          <h1 className="readout-title">{chapter.title}</h1>
          <p className="readout-body">{chapter.body}</p>
        </div>

        <p className="hint" data-on={active === 0 ? "1" : "0"}>
          Faites défiler pour suivre l&apos;eau
        </p>

        <DevCamera />
      </div>
    </div>
  );
}
