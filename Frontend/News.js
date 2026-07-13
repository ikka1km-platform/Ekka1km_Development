/*
============================================================
EKKA1KM FRONTEND
News.js
News + News Details + Share
V1.0 Trial
============================================================
*/

let CURRENT_NEWS = null;


/*
============================================================
LOAD NEWS
============================================================
*/

async function loadNews() {

  const container =
    document.getElementById(
      "newsList"
    );

  if (!container)
    return;

  container.innerHTML =
    "<div class='card'>Loading News...</div>";

  try {

    const response =
      await fetch(
        `${getApiUrl()}?action=news&lat=${CURRENT_LAT}&lng=${CURRENT_LNG}&radius=${getRadius()}`
      );

    const json =
      await response.json();

    const news =
      json.data || [];

    if (
      news.length === 0
    ) {
      container.innerHTML =
        "<div class='card'>No News Found.</div>";

      return;
    }

    let html = "";

    news.forEach(
      item => {

        html += `
        <div class="newsCard">

          <h3>
            ${item.Title || "-"}
          </h3>

          <p>
            ${
              (item.Description || "")
                .substring(0, 120)
            }...
          </p>

          <button
            onclick='showNewsDetails(${JSON.stringify(item)})'>
            Read More
          </button>

        </div>
        `;
      }
    );

    container.innerHTML =
      html;

  }
  catch (err) {

    console.log(err);

    container.innerHTML =
      "<div class='card'>Unable to load news.</div>";
  }
}


/*
============================================================
NEWS DETAILS
============================================================
*/

function showNewsDetails(
  item
) {

  CURRENT_NEWS =
    item;

  const container =
    document.getElementById(
      "newsList"
    );

  let html = `
  <div class="card">

    <h2>
      ${item.Title || "-"}
    </h2>

    ${
      item.ImageURL
        ? `
        <img
          src="${item.ImageURL}"
          style="
            width:100%;
            border-radius:15px;
            margin-top:15px;
            margin-bottom:15px;
          ">
        `
        : ""
    }

    <p>
      ${item.Description || ""}
    </p>

    <br>

    <button
      onclick="shareNews()">
      Share
    </button>

    <button
      onclick="openPage('news')"
      style="background:#666;">
      Back
    </button>

  </div>
  `;

  container.innerHTML =
    html;

  openPage(
    "news"
  );
}


/*
============================================================
SHARE NEWS
============================================================
*/

function shareNews() {

  if (
    !CURRENT_NEWS
  ) {
    return;
  }

  const text =
    `${CURRENT_NEWS.Title || ""}

${CURRENT_NEWS.Description || ""}`;

  if (
    navigator.share
  ) {

    navigator.share({
      title:
        CURRENT_NEWS.Title,
      text
    });

  } else {

    navigator.clipboard
      .writeText(text);

    alert(
      "News copied to clipboard."
    );
  }
}

