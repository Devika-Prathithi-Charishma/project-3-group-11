function loadLevel(level) {
  d3.select("#visualization").html("");
  d3.select("#controls").html("");
  document.getElementById("status-bar").textContent = "Viewing: Level " + level;
  if (level === 1) loadLevel1();
  else if (level === 2) loadLevel2();
  else if (level === 3) loadLevel3();
  else if (level === 4) loadLevel4();
}
window.loadLevel = loadLevel;

// Level 1
function loadLevel1() {
  d3.csv("data/game-of-thrones.csv").then(data => {
    const cleaned = data.filter(d => d.Speaker && d.Season).map(d => ({
      speaker: d.Speaker.trim().toUpperCase(),
      season: d.Season.trim().toLowerCase(),
      character: d.Character ? d.Character.trim().toUpperCase() : ""
    }));
    const allSeasons = [...new Set(cleaned.map(d => d.season))].sort();
    d3.select("#controls").append("label").text("Season:");
    const select = d3.select("#controls").append("select");
    allSeasons.forEach(season => select.append("option").text(season));
    function render(season) {
      const filtered = cleaned.filter(d => d.season === season);
      const counts = d3.rollups(filtered, v => v.length, d => d.character || d.speaker)
        .map(([character, count]) => ({ character, count }))
        .filter(d => d.count > 20)
        .sort((a, b) => b.count - a.count);
      d3.select("#visualization").html("");
      const margin = { top: 30, right: 10, bottom: 150, left: 60 }, width = 960, height = 500;
      const svg = d3.select("#visualization").append("svg")
        .attr("width", width).attr("height", height)
        .append("g").attr("transform", "translate(60,30)");
      const x = d3.scaleBand().domain(counts.map(d => d.character)).range([0, width - 100]).padding(0.1);
      const y = d3.scaleLinear().domain([0, d3.max(counts, d => d.count)]).range([height - 100, 0]);
      svg.append("g").attr("transform", `translate(0,${height - 100})`)
        .call(d3.axisBottom(x)).selectAll("text").attr("transform", "rotate(-65)").style("text-anchor", "end").style("fill", "#ccc");
      svg.append("g").call(d3.axisLeft(y)).selectAll("text").style("fill", "#ccc");
      svg.selectAll("rect").data(counts).enter().append("rect")
        .attr("x", d => x(d.character)).attr("y", d => y(d.count))
        .attr("width", x.bandwidth()).attr("height", d => height - 100 - y(d.count)).attr("fill", "steelblue");
    }
    render(allSeasons[0]);
    select.on("change", function() { render(this.value); });
  });
}

// Level 2
function loadLevel2() {
  d3.csv("data/game-of-thrones.csv").then(data => {
    const characters = [...new Set(data.map(d => d.Speaker).filter(Boolean))].slice(0, 10);
    const select = d3.select("#controls").append("select");
    characters.forEach(c => select.append("option").text(c));
    select.on("change", function() { renderCloud(this.value); });
    renderCloud(characters[0]);

    function renderCloud(selected) {
      const words = data.filter(d => d.Speaker === selected).flatMap(d =>
        (d.Text || "").toLowerCase().replace(/[.,!?]/g, "").split(/\s+/)
      ).filter(w => w.length > 3);
      const freq = {};
      words.forEach(w => freq[w] = (freq[w] || 0) + 1);
      const entries = Object.entries(freq).map(([text, size]) => ({ text, size }));
      d3.select("#visualization").html("");
      const layout = d3.layout.cloud().size([800, 400]).words(entries)
        .padding(5).rotate(() => ~~(Math.random() * 2) * 90)
        .fontSize(d => 10 + d.size).on("end", draw);
      layout.start();
      function draw(words) {
        d3.select("#visualization").append("svg")
          .attr("width", 800).attr("height", 400)
          .append("g").attr("transform", "translate(400,200)")
          .selectAll("text").data(words).enter().append("text")
          .style("font-size", d => d.size + "px")
          .style("fill", "gold").attr("text-anchor", "middle")
          .attr("transform", d => `translate(${d.x},${d.y}) rotate(${d.rotate})`)
          .text(d => d.text);
      }
    }
  });
}

// Level 3
function loadLevel3() {
  d3.csv("data/game-of-thrones.csv").then(data => {
    const allSeasons = [...new Set(data.map(d => d.Season).filter(Boolean))].sort();
    const control = d3.select("#controls");
    control.append("label").text("Season:");
    const seasonSelect = control.append("select");
    allSeasons.forEach(season => seasonSelect.append("option").text(season));
    seasonSelect.on("change", function () {
      renderCooccurrence(this.value);
    });
    renderCooccurrence(allSeasons[0]);

    function renderCooccurrence(season) {
      const seasonData = data.filter(d => d.Season === season);
      const interactions = {};
      let lastSpeaker = null;

      seasonData.forEach(d => {
        const current = d.Speaker?.trim();
        if (current && lastSpeaker && current !== lastSpeaker) {
          const pair = [current, lastSpeaker].sort().join("|");
          interactions[pair] = (interactions[pair] || 0) + 1;
        }
        lastSpeaker = d.Speaker?.trim();
      });

      const entries = Object.entries(interactions)
        .map(([pair, count]) => {
          const [char1, char2] = pair.split("|");
          return { pair, char1, char2, count };
        })
        .filter(d => d.count > 3)
        .sort((a, b) => b.count - a.count)
        .slice(0, 20); // top 20 most frequent co-occurrences

      d3.select("#visualization").html("");

      const margin = { top: 20, right: 30, bottom: 50, left: 200 };
      const width = 900 - margin.left - margin.right;
      const height = 25 * entries.length;

      const svg = d3.select("#visualization").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      const y = d3.scaleBand()
        .domain(entries.map(d => `${d.char1} & ${d.char2}`))
        .range([0, height])
        .padding(0.1);

      const x = d3.scaleLinear()
        .domain([0, d3.max(entries, d => d.count)])
        .range([0, width]);

      svg.selectAll("rect")
        .data(entries)
        .enter()
        .append("rect")
        .attr("x", 0)
        .attr("y", d => y(`${d.char1} & ${d.char2}`))
        .attr("width", d => x(d.count))
        .attr("height", y.bandwidth())
        .attr("fill", "#6baed6");

      svg.append("g")
        .call(d3.axisLeft(y))
        .selectAll("text")
        .style("fill", "#eee");

      svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .style("fill", "#eee");

      svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + 40)
        .attr("text-anchor", "middle")
        .attr("fill", "#ccc")
        .text("Co-occurrence Count");
    }
  });
}

// Level 4
function loadLevel4() {
  d3.select("#controls").append("input")
    .attr("id", "searchTerm").attr("placeholder", "Search word or phrase");
  d3.select("#controls").append("button").text("Search").on("click", search);
  function search() {
    const term = document.getElementById("searchTerm").value.toLowerCase();
    d3.csv("data/game-of-thrones.csv").then(data => {
      const matches = data.filter(d => d.Text && d.Text.toLowerCase().includes(term));
      const grouped = d3.rollups(matches, v => v.length, d => d.Season);
      d3.select("#visualization").html("<h3>Mentions by Season:</h3><ul>" +
        grouped.map(([s, c]) => `<li>${s}: ${c} times</li>`).join("") + "</ul>");
    });
  }
}
