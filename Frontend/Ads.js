/*
============================================================
EKKA1KM FRONTEND
Ads.js
Advertisements + PIP Ads
V1.0 Trial
============================================================
*/

let CURRENT_ADS = [];
let CURRENT_PIP_AD = null;


/*
============================================================
LOAD ADVERTISEMENTS
============================================================
*/

async function loadAdvertisements() {

  const container =
    document.getElementById(
      "advertisementList"
    );

  if (!container)
    return;

  container.innerHTML =
    "<div class='card'>Loading Advertisements...</div>";

  try {

    const response =
      await fetch(
        `${getApiUrl()}?action=advertisements&lat=${CURRENT_LAT}&lng=${CURRENT_LNG}&radius=${getRadius()}`
      );

    const json =
      await response.json();

    CURRENT_ADS =
      (json.data &&
        json.data.data) ||
      [];

    renderAdvertisements();

  }
  catch (err) {

    console.log(err);

    container.innerHTML =
      "<div class='card'>Unable to load advertisements.</div>";
  }
}


/*
============================================================
RENDER ADVERTISEMENTS
============================================================
*/

function renderAdvertisements() {

  const container =
    document.getElementById(
      "advertisementList"
    );

  if (!container)
    return;

  if (
    CURRENT_ADS.length === 0
  ) {

    container.innerHTML =
      "<div class='card'>No Advertisements Found.</div>";

    return;
  }

  let html = "";

  CURRENT_ADS.forEach(
    ad => {

      html += `
      <div class="card">

        ${
          ad.ImageURL
            ? `
            <img
              src="${ad.ImageURL}"
              style="
                width:100%;
                border-radius:15px;
                margin-bottom:10px;
              ">
            `
            : ""
        }

        <h3>
          ${ad.Title || "-"}
        </h3>

        <p>
          ${ad.Description || ""}
        </p>

        ${
          ad.ExternalURL
            ? `
            <button
              onclick="openAdvertisement('${ad.ExternalURL}')">
              Open
            </button>
            `
            : ""
        }

      </div>
      `;
    }
  );

  container.innerHTML =
    html;
}


/*
============================================================
OPEN ADVERTISEMENT
============================================================
*/

function openAdvertisement(
  url
) {

  if (!url)
    return;

  window.open(
    url,
    "_blank"
  );
}


/*
============================================================
LOAD PIP AD
============================================================
*/

async function loadPipAd() {

  try {

    const response =
      await fetch(
        `${getApiUrl()}?action=pipads&lat=${CURRENT_LAT}&lng=${CURRENT_LNG}&radius=${getRadius()}`
      );

    const json =
      await response.json();

    const ads =
      (json.data &&
        json.data.data) ||
      [];

    if (
      ads.length === 0
    ) {
      return;
    }

    CURRENT_PIP_AD =
      ads[0];

    showPipAd();

  }
  catch (err) {

    console.log(err);
  }
}


/*
============================================================
SHOW PIP AD
============================================================
*/

function showPipAd() {

  if (
    !CURRENT_PIP_AD
  ) {
    return;
  }

  let pip =
    document.getElementById(
      "pipAdContainer"
    );

  if (!pip) {

    pip =
      document.createElement(
        "div"
      );

    pip.id =
      "pipAdContainer";

    pip.style.position =
      "fixed";

    pip.style.bottom =
      "80px";

    pip.style.right =
      "10px";

    pip.style.width =
      "180px";

    pip.style.background =
      "#fff";

    pip.style.borderRadius =
      "15px";

    pip.style.boxShadow =
      "0 4px 15px rgba(0,0,0,.2)";

    pip.style.zIndex =
      "99999";

    pip.style.overflow =
      "hidden";

    document.body.appendChild(
      pip
    );
  }

  pip.innerHTML =
    `
    <div style="padding:10px">

      <div style="
        display:flex;
        justify-content:space-between;
        margin-bottom:8px;
      ">

        <strong>Ad</strong>

        <span
          onclick="closePipAd()"
          style="
            cursor:pointer;
            color:red;
          ">
          ✕
        </span>

      </div>

      ${
        CURRENT_PIP_AD.ImageURL
          ? `
          <img
            src="${CURRENT_PIP_AD.ImageURL}"
            style="
              width:100%;
              border-radius:10px;
            ">
          `
          : ""
      }

      <h4 style="
        margin-top:10px;
      ">
        ${CURRENT_PIP_AD.Title || ""}
      </h4>

      <button
        onclick="openPipAd()">
        Open
      </button>

    </div>
    `;
}


/*
============================================================
OPEN PIP AD
============================================================
*/

function openPipAd() {

  if (
    !CURRENT_PIP_AD
  ) {
    return;
  }

  if (
    CURRENT_PIP_AD.ExternalURL
  ) {

    window.open(
      CURRENT_PIP_AD.ExternalURL,
      "_blank"
    );
  }
}


/*
============================================================
CLOSE PIP AD
============================================================
*/

function closePipAd() {

  const pip =
    document.getElementById(
      "pipAdContainer"
    );

  if (pip) {
    pip.remove();
  }
}

