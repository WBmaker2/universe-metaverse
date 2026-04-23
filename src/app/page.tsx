import { HomeActions } from "@/components/HomeActions";
import { PLANETS } from "@/lib/planets";
import { Music2, Radio, UsersRound } from "lucide-react";

export default function HomePage() {
  return (
    <main className="home-shell">
      <section className="home-hero" aria-labelledby="home-title">
        <div className="hero-visual" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="orbit orbit-three" />
          {PLANETS.slice(0, 8).map((planet, index) => (
            <span
              className="hero-planet"
              key={planet.id}
              style={
                {
                  "--planet-color": planet.color,
                  "--planet-accent": planet.accent,
                  "--planet-index": index,
                } as React.CSSProperties
              }
            />
          ))}
        </div>

        <div className="hero-copy">
          <p className="eyebrow">음악 감상 수업용 2D 메타버스</p>
          <h1 id="home-title">우주 음악 메타버스</h1>
          <p className="hero-summary">
            학생들이 행성 사이를 이동하며 음악을 듣고, 서로의 위치와 생각을 나누는
            교실용 감상 공간입니다.
          </p>
          <HomeActions />
        </div>
      </section>

      <section className="home-details" aria-label="핵심 기능">
        <article>
          <UsersRound size={22} aria-hidden="true" />
          <h2>세션코드 입장</h2>
          <p>교사가 만든 코드로 학생들이 이름만 입력하고 같은 우주 공간에 들어옵니다.</p>
        </article>
        <article>
          <Music2 size={22} aria-hidden="true" />
          <h2>행성별 감상</h2>
          <p>행성에 가까워지거나 클릭하면 준비된 MP3가 재생되고 멀어지면 멈춥니다.</p>
        </article>
        <article>
          <Radio size={22} aria-hidden="true" />
          <h2>실시간 소통</h2>
          <p>학생 이름표, 위치 공유, 채팅, 기본 비속어 필터를 한 화면에서 사용합니다.</p>
        </article>
      </section>
    </main>
  );
}
