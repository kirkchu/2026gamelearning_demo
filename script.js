const WINNING_MARGIN = 20;
const MAX_POINTS = 5;
const POINT_INTERVAL_MS = 5000;

const teams = {
  blue: {
    name: "藍隊",
    score: 0,
    input: "",
    problem: null,
    startedAt: 0,
    nodes: {},
  },
  red: {
    name: "紅隊",
    score: 0,
    input: "",
    problem: null,
    startedAt: 0,
    nodes: {},
  },
};

let frozen = false;

function pickNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function createProblem() {
  const operation = ["+", "-", "×", "÷"][pickNumber(0, 3)];

  if (operation === "+") {
    const a = pickNumber(1, 50);
    const b = pickNumber(1, 50);
    return { text: `${a} + ${b} = ?`, answer: a + b };
  }

  if (operation === "-") {
    const a = pickNumber(8, 99);
    const b = pickNumber(1, a);
    return { text: `${a} - ${b} = ?`, answer: a - b };
  }

  if (operation === "×") {
    const a = pickNumber(2, 12);
    const b = pickNumber(2, 12);
    return { text: `${a} × ${b} = ?`, answer: a * b };
  }

  const answer = pickNumber(2, 12);
  const divisor = pickNumber(2, 12);
  return { text: `${answer * divisor} ÷ ${divisor} = ?`, answer };
}

function pointsForElapsed(elapsedMs) {
  const penalty = Math.floor(elapsedMs / POINT_INTERVAL_MS);
  return Math.max(1, MAX_POINTS - penalty);
}

function startProblem(teamKey) {
  const team = teams[teamKey];
  team.problem = createProblem();
  team.input = "";
  team.startedAt = Date.now();
  team.nodes.problem.textContent = team.problem.text;
  team.nodes.answer.textContent = "0";
  team.nodes.message.textContent = "";
}

function renderScores() {
  teams.blue.nodes.score.textContent = teams.blue.score;
  teams.red.nodes.score.textContent = teams.red.score;

  const diff = teams.blue.score - teams.red.score;
  const absDiff = Math.abs(diff);
  const leaderText = document.querySelector("#leader-text");
  const diffText = document.querySelector("#diff-text");
  leaderText.textContent = diff === 0 ? "雙方平手" : `${diff > 0 ? "藍隊" : "紅隊"}領先`;
  diffText.textContent = `差距 ${absDiff} 分`;
  renderTug(diff);
}

function renderTug(diff) {
  const stage = document.querySelector(".tug-stage");
  const bluePullers = document.querySelector("#blue-pullers");
  const redPullers = document.querySelector("#red-pullers");
  const rope = document.querySelector("#rope");
  const stageWidth = stage.getBoundingClientRect().width || 520;
  const limitedDiff = Math.max(-WINNING_MARGIN, Math.min(WINNING_MARGIN, diff));
  const pull = limitedDiff / WINNING_MARGIN;
  const center = stageWidth / 2;
  const baseDistance = Math.min(stageWidth * 0.24, 150);
  const maxShift = Math.min(stageWidth * 0.18, 120);
  const sharedShift = pull * maxShift;
  const blueX = center - baseDistance - sharedShift;
  const redX = center + baseDistance - sharedShift;

  bluePullers.style.left = `${blueX}px`;
  redPullers.style.left = `${redX}px`;
  rope.style.left = `${(blueX + redX) / 2}px`;
  rope.style.width = `${Math.max(160, redX - blueX)}px`;
}

function updateAnswer(teamKey) {
  const team = teams[teamKey];
  team.nodes.answer.textContent = team.input || "0";
}

function submitAnswer(teamKey) {
  if (frozen) return;

  const team = teams[teamKey];
  if (!team.input) {
    team.nodes.message.textContent = "請先輸入答案";
    return;
  }

  const submitted = Number(team.input);
  if (submitted !== team.problem.answer) {
    team.nodes.message.textContent = "答錯了，再試一次！";
    team.input = "";
    updateAnswer(teamKey);
    return;
  }

  const earned = pointsForElapsed(Date.now() - team.startedAt);
  team.score += earned;
  team.nodes.message.textContent = `答對！得到 ${earned} 分`;
  renderScores();

  const scoreDiff = teams.blue.score - teams.red.score;
  if (Math.abs(scoreDiff) >= WINNING_MARGIN) {
    finishGame(scoreDiff > 0 ? "blue" : "red");
    return;
  }

  window.setTimeout(() => {
    if (!frozen) startProblem(teamKey);
  }, 480);
}

function handleKeyPress(event) {
  const button = event.target.closest("button[data-team]");
  if (!button || frozen) return;

  const { team, key } = button.dataset;
  const current = teams[team];
  if (key === "submit") {
    submitAnswer(team);
    return;
  }

  if (key === "clear") {
    current.input = "";
    current.nodes.message.textContent = "";
    updateAnswer(team);
    return;
  }

  if (current.input.length < 3) {
    current.input += key;
    current.nodes.message.textContent = "";
    updateAnswer(team);
  }
}

function finishGame(winnerKey) {
  frozen = true;
  document.querySelector(".game-shell").classList.add("frozen");
  document.querySelectorAll(".keypad button").forEach((button) => {
    button.disabled = true;
  });
  document.querySelector("#winner-text").textContent = `${teams[winnerKey].name}獲勝！`;
  document.querySelector("#winner-overlay").hidden = false;
}

function resetGame() {
  frozen = false;
  Object.values(teams).forEach((team) => {
    team.score = 0;
    team.input = "";
  });
  document.querySelector(".game-shell").classList.remove("frozen");
  document.querySelector("#winner-overlay").hidden = true;
  document.querySelectorAll(".keypad button").forEach((button) => {
    button.disabled = false;
  });
  startProblem("blue");
  startProblem("red");
  renderScores();
}

function bindNodes() {
  Object.entries(teams).forEach(([key, team]) => {
    team.nodes = {
      score: document.querySelector(`#${key}-score`),
      problem: document.querySelector(`#${key}-problem`),
      answer: document.querySelector(`#${key}-answer`),
      message: document.querySelector(`#${key}-message`),
    };
  });
}

document.addEventListener("click", handleKeyPress);
document.querySelector("#reset-game").addEventListener("click", resetGame);
window.addEventListener("resize", () => {
  renderTug(teams.blue.score - teams.red.score);
});

bindNodes();
resetGame();

window.gameLearningDebug = {
  teams,
  pointsForElapsed,
  submitAnswer,
  startProblem,
  resetGame,
};
