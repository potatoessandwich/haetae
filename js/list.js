import { mountMuteButton } from "./sound.js";

mountMuteButton(document.body);

const grid = document.getElementById("card-grid");
const noticeEl = document.getElementById("notice");

fetch("data/specimens.json")
  .then((r) => r.json())
  .then((data) => {
    noticeEl.innerHTML = `<b>실제 유물 안내</b> — ${data.notice.kr}`;
    data.specimens.forEach((s) => {
      const card = document.createElement("a");
      card.className = "specimen-card";
      card.href = `detail.html?id=${s.id}`;
      card.innerHTML = `
        <div class="scanline"></div>
        <span class="code">${s.code}</span>
        <span class="direction">/ ${s.directionEn}</span>
        <h3>${s.nameKr}</h3>
        <div class="meta">
          TRIANGLES ${s.triangles.toLocaleString()}<br />
          LICENSE ${s.license}<br />
          SOURCE ${s.author}
        </div>
      `;
      grid.appendChild(card);
    });

    const compareCard = document.createElement("a");
    compareCard.className = "specimen-card compare";
    compareCard.href = "detail.html?id=compare";
    compareCard.innerHTML = `
      <div>
        <span class="code">COMPARE</span>
        <span class="direction">/ A + B</span>
        <h3 style="margin-top:10px">두 표본을 겹쳐 비교 절개한다</h3>
      </div>
      <span class="tag-virtual">가상 표본 생성 단계 포함</span>
    `;
    grid.appendChild(compareCard);
  })
  .catch((err) => {
    grid.innerHTML = `<p style="color:#9c3232">표본 데이터를 불러오지 못했습니다. (${err.message})</p>`;
  });
