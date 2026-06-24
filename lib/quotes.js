export const quotes = [
  { text: "작은 노력이 모여 큰 변화를 만든다.", author: "로버트 콜리어" },
  { text: "오늘의 한 시간이 내일의 나를 만든다.", author: "벤자민 프랭클린" },
  { text: "꾸준함은 재능을 이긴다.", author: "앤절라 더크워스" },
  { text: "지금 포기하면 어제의 노력이 아깝다.", author: "토마스 에디슨" },
  { text: "느려도 괜찮아, 멈추지만 않으면.", author: "공자" },
  { text: "할 수 있다고 믿는 순간 이미 반은 이룬 것.", author: "테어도어 루스벨트" },
  { text: "가장 좋은 시작은 지금이다.", author: "마크 트웨인" },
  { text: "어제보다 나은 오늘, 그것으로 충분하다.", author: "파울로 코엘료" },
  { text: "힘들 때 한 걸음 더가 진짜 실력이 된다.", author: "마이클 조던" },
  { text: "목표를 적으면 현실이 된다.", author: "브라이언 트레이시" },
  { text: "실패는 성공의 연습이다.", author: "헨리 포드" },
  { text: "집중한 1시간이 멍한 5시간보다 낫다.", author: "빌 게이츠" },
  { text: "잘하는 사람도 처음엔 못했다.", author: "마이클 조던" },
  { text: "매일 1%씩 성장하면 1년 후엔 37배.", author: "제임스 클리어" },
  { text: "지금 이 순간이 가장 젊은 나다.", author: "공자" },
  { text: "완벽하지 않아도 돼, 시작만 하면 돼.", author: "마크 저커버그" },
  { text: "시간은 누구에게나 공평하다. 차이는 사용법.", author: "랜디 포시" },
  { text: "꿈꾸는 것만으로는 부족해, 실행하자.", author: "월트 디즈니" },
  { text: "포기는 습관이고, 끈기도 습관이다.", author: "빈스 롬바르디" },
  { text: "남과 비교 말고, 어제의 나와 비교하자.", author: "조던 피터슨" },
  { text: "지금 읽는 이 한 줄이 미래를 바꾼다.", author: "짐 론" },
  { text: "오늘의 땀이 내일의 자신감이 된다.", author: "아놀드 슈워제네거" },
  { text: "어려운 문제일수록 풀었을 때 기쁨이 크다.", author: "알베르트 아인슈타인" },
  { text: "지치면 쉬어도 돼, 포기만 하지 마.", author: "안철수" },
  { text: "합격의 차이는 결국 꾸준함이다.", author: "마이클 펠프스" },
  { text: "해야 할 일을 미루지 마, 미래의 내가 고마워할 거야.", author: "나이키" },
  { text: "공부하는 이유가 분명하면 포기할 수 없다.", author: "사이먼 시넥" },
  { text: "내가 나를 믿어야 세상도 나를 믿는다.", author: "오프라 윈프리" },
  { text: "남들이 쉴 때 한 페이지 더.", author: "코비 브라이언트" },
  { text: "공부는 미래의 나에게 주는 가장 큰 선물.", author: "에이브러햄 링컨" },
  { text: "잘하는 사람은 더 잘하려 하고, 못하는 사람은 포기한다.", author: "캐럴 드웩" },
]

export function getTodayQuote() {
  const now = new Date()
  const adjusted = new Date(now.getTime() - 4 * 60 * 60 * 1000)
  const dayOfYear = Math.floor((adjusted.getTime() - new Date(adjusted.getFullYear(), 0, 0).getTime()) / 86400000)
  return quotes[dayOfYear % quotes.length]
}

export function getQuoteByDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  const dayOfYear = Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86400000)
  return quotes[dayOfYear % quotes.length]
}
