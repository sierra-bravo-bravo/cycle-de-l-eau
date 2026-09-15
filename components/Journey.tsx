"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence } from "motion/react";
import type { Variants } from "motion/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import Scene from "./Scene";
import DevCamera from "./DevCamera";
import { GlowButton } from "./GlowButton";
import { GlassEffect } from "./GlassEffect";
import { AnimatedGroup } from "@/components/core/animated-group";
import { TextEffect } from "@/components/core/text-effect";
import { CHAPTERS } from "@/content/chapters";
import { asset } from "@/lib/asset";
import { toScreen, view, viewport } from "@/lib/camera";

const LAST = CHAPTERS.length - 1;
const HERO_ZOOM = 0.92;
const STEPS = CHAPTERS.slice(1);

const SPOTS = CHAPTERS.flatMap((ch, chapter) =>
  ch.hotspots.map((spot) => ({ ...spot, chapter })),
);

const cardVariants: { container: Variants; item: Variants } = {
  container: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      filter: "none",
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.04,
      },
    },
    exit: {
      opacity: 0,
      y: -12,
      filter: "blur(4px)",
      transition: { duration: 0.15, ease: "easeOut" },
    },
  },
  item: {
    hidden: { opacity: 0, y: 12, filter: "blur(4px)" },
    visible: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: { duration: 0.4, ease: "easeOut" },
    },
  },
};

export default function Journey() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const sceneLayerRef = useRef<HTMLDivElement>(null);
  const veilRef = useRef<HTMLDivElement>(null);
  const lineTopRef = useRef<HTMLDivElement>(null);
  const lineBotRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const spotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const activeRef = useRef(0);
  const [active, setActive] = useState(0);
  const [openSpot, setOpenSpot] = useState<number | null>(null);
  const lenisRef = useRef<Lenis | null>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

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
      ScrollTrigger.refresh();
    };
    resize();
    window.addEventListener("resize", resize);

    Object.assign(view, {
      ...CHAPTERS[0].focus,
      zoom: reduced ? CHAPTERS[0].focus.zoom : HERO_ZOOM,
    });

    const layer = sceneLayerRef.current;
    const veil = veilRef.current;
    const lineTop = lineTopRef.current;
    const lineBot = lineBotRef.current;
    const hint = hintRef.current;

    const applyVeil = (blur: number, wash: number, scale: number) => {
      if (layer) {
        layer.style.setProperty("--scene-blur", `${blur}px`);
        layer.style.setProperty("--scene-scale", String(scale));
      }
      if (veil) veil.style.opacity = String(wash);
    };

    if (reduced) {
      applyVeil(0, 0, 1);
    } else {
      applyVeil(22, 0.42, 1.08);
    }

    const syncActive = (i: number) => {
      if (i !== activeRef.current) {
        activeRef.current = i;
        setActive(i);
        setOpenSpot(null);
      }
    };

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: wrapRef.current,
        start: "top top",
        end: "bottom bottom",
        scrub: reduced ? true : 0.7,
        onUpdate: () => {
          const time = tl.time();
          let i = 0;
          for (let s = LAST; s >= 1; s--) {
            const at = tl.labels[`s${s}`];
            if (at !== undefined && time >= at - 0.12) {
              i = s;
              break;
            }
          }
          syncActive(i);
        },
      },
    });
    tlRef.current = tl;

    const hero = { blur: reduced ? 0 : 22, wash: reduced ? 0 : 0.42, scale: reduced ? 1 : 1.08 };

    tl.addLabel("s0", 0);
    tl.to(
      hero,
      {
        blur: 0,
        wash: 0,
        scale: 1,
        duration: 1,
        ease: "power2.out",
        onUpdate: () => applyVeil(hero.blur, hero.wash, hero.scale),
      },
      0,
    );
    tl.to(view, { zoom: 0.75, duration: 1, ease: "power1.inOut" }, 0);

    if (lineTop && !reduced) {
      tl.to(
        lineTop,
        {
          x: "42vw",
          filter: "blur(18px)",
          opacity: 0,
          duration: 1,
          ease: "power2.in",
        },
        0,
      );
    }
    if (lineBot && !reduced) {
      tl.to(
        lineBot,
        {
          x: "-42vw",
          filter: "blur(18px)",
          opacity: 0,
          duration: 1,
          ease: "power2.in",
        },
        0,
      );
    }
    if (hint) {
      tl.to(hint, { opacity: 0, y: 16, duration: 0.55, ease: "power2.out" }, 0);
    }

    if (reduced && lineTop && lineBot) {
      gsap.set([lineTop, lineBot, hint], { opacity: 0 });
    }

    tl.to({}, { duration: 0.45 });

    CHAPTERS.slice(1).forEach((ch, idx) => {
      tl.addLabel(`s${idx + 1}`);
      tl.to(view, {
        x: ch.focus.x,
        y: ch.focus.y,
        zoom: ch.focus.zoom,
        flow: ch.focus.flow,
        duration: 1,
        ease: "power1.inOut",
      });
    });

    const render = () => {
      const rail = 108;
      const cardW = 260;
      const cardH = 120;
      for (let i = 0; i < SPOTS.length; i++) {
        const el = spotRefs.current[i];
        if (!el) continue;
        const s = SPOTS[i];
        const p = toScreen(s.x, s.y);
        el.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0)`;
        if (el.style.visibility !== "visible") el.style.visibility = "visible";
        const on = s.chapter === activeRef.current ? "1" : "0";
        if (el.dataset.on !== on) el.dataset.on = on;
        const side = p.x + cardW > viewport.w - rail ? "left" : "right";
        const vert =
          p.y + cardH > viewport.h - 28 || side === "left" ? "top" : "bottom";
        if (el.dataset.side !== side) el.dataset.side = side;
        if (el.dataset.vert !== vert) el.dataset.vert = vert;
      }
    };
    gsap.ticker.add(render);

    return () => {
      gsap.ticker.remove(render);
      gsap.ticker.remove(raf);
      window.removeEventListener("resize", resize);
      tl.scrollTrigger?.kill();
      tl.kill();
      tlRef.current = null;
      lenis.destroy();
    };
  }, []);

  const goTo = (i: number) => {
    const wrap = wrapRef.current;
    const tl = tlRef.current;
    if (!wrap || !lenisRef.current || !tl) return;
    const travel = wrap.offsetHeight - window.innerHeight;
    const time = i <= 0 ? 0 : (tl.labels[`s${i}`] ?? 0) + 0.15;
    const progress = tl.duration() ? time / tl.duration() : 0;
    lenisRef.current.scrollTo(wrap.offsetTop + progress * travel, { duration: 1.2 });
  };

  const chapter = CHAPTERS[active];
  const firstSpot = SPOTS.findIndex((s) => s.chapter === active);

  return (
    <div ref={wrapRef} style={{ height: `${CHAPTERS.length * 120}vh` }}>
      <div className="stage">
        <div ref={sceneLayerRef} className="scene-layer">
          <Scene />
        </div>
        <div ref={veilRef} className="hero-veil" aria-hidden="true" />

        {SPOTS.map((s, i) => (
          <div
            key={`${s.chapter}-${s.title}`}
            ref={(el) => {
              spotRefs.current[i] = el;
            }}
            className="spot"
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
              <GlassEffect />
              <p className="spot-title">{s.title}</p>
              <p className="spot-detail">{s.detail}</p>
            </div>
          </div>
        ))}

        <header className="brand">
          <img
            src={asset("/logo-sogea.png")}
            alt="SOGEA Environnement"
            className="brand-logo"
            width={168}
            height={40}
          />
          <span className="brand-sep" />
          <span className="muted">Le cycle de l&apos;eau</span>
        </header>

        <div className="hero" data-on={active === 0 ? "1" : "0"} aria-hidden={active !== 0}>
          <h1 className="hero-title">
            <div ref={lineTopRef} className="hero-line-wrap">
              <TextEffect
                as="span"
                per="word"
                preset="fade-in-blur"
                className="hero-line hero-line-top whitespace-nowrap"
                speedReveal={0.85}
              >
                De la ressource
              </TextEffect>
            </div>
            <div ref={lineBotRef} className="hero-line-wrap">
              <TextEffect
                as="span"
                per="word"
                preset="fade-in-blur"
                delay={0.18}
                className="hero-line hero-line-bot whitespace-nowrap"
                speedReveal={0.85}
              >
                au milieu naturel
              </TextEffect>
            </div>
          </h1>

          <div ref={hintRef} className="hero-hint">
            <GlowButton className="hero-hint-btn" onClick={() => goTo(1)}>
              Faites défiler pour découvrir le cycle de l&apos;eau
            </GlowButton>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {active > 0 ? (
            <AnimatedGroup
              key={chapter.id}
              className="step-card"
              variants={cardVariants}
            >
              <GlassEffect />
              <p className="step-kicker">{chapter.label}</p>
              <h2 className="step-title">{chapter.title}</h2>
              <p className="step-body">{chapter.body}</p>
              <GlowButton
                className="step-cta"
                glowBlur="softest"
                onClick={() => {
                  if (firstSpot >= 0) setOpenSpot(firstSpot);
                }}
              >
                Découvrir cette expertise
              </GlowButton>
            </AnimatedGroup>
          ) : null}
        </AnimatePresence>

        <nav
          className="rail"
          data-on={active > 0 ? "1" : "0"}
          aria-hidden={active === 0}
          aria-label="Étapes du cycle"
        >
          {STEPS.map((c, i) => {
            const index = i + 1;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => goTo(index)}
                data-on={index === active ? "1" : "0"}
                aria-label={`Étape ${c.index}`}
                aria-current={index === active ? "step" : undefined}
              >
                <span className="rail-idx">{c.index}</span>
                <span className="rail-bar" />
                <span className="rail-label">Étape</span>
              </button>
            );
          })}
        </nav>

        <DevCamera />
      </div>
    </div>
  );
}
