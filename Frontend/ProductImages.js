/*
============================================================
EKKA1KM FRONTEND
ProductImages.js
Product Image System - Thumbnail, Slider, Full Screen Viewer
V1.0
============================================================
*/

let PRODUCT_IMAGE_SLIDE = 0;


/*
============================================================
GET ALL PRODUCT IMAGES
============================================================
*/

function getProductImages(product) {
  if (!product) return [];

  const urls = [];

  // ImageURL (primary)
  if (product.ImageURL && product.ImageURL.trim()) {
    urls.push(product.ImageURL.trim());
  }

  // Image2
  if (product.Image2 && product.Image2.trim()) {
    urls.push(product.Image2.trim());
  }

  // Image3
  if (product.Image3 && product.Image3.trim()) {
    urls.push(product.Image3.trim());
  }

  // Image4
  if (product.Image4 && product.Image4.trim()) {
    urls.push(product.Image4.trim());
  }

  // Image5
  if (product.Image5 && product.Image5.trim()) {
    urls.push(product.Image5.trim());
  }

  return urls;
}


/*
============================================================
PRODUCT THUMBNAIL HTML
============================================================
*/

function productThumbnailHTML(product, opts = {}) {
  const images = getProductImages(product);
  const firstImage = images.length > 0 ? images[0] : "";
  const height = opts.height || "180px";
  const className = opts.className || "productThumb";

  if (!firstImage) {
    return `
      <div class="${className}" style="width:100%;height:${height};background:linear-gradient(135deg,#e8f5e9,#c8e6c9);border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;margin-bottom:10px;">
        <i class="material-icons" style="font-size:48px;color:var(--primary);">image</i>
        <span style="font-size:12px;color:var(--primary);margin-top:4px;">No Image</span>
      </div>
    `;
  }

  return `
    <div class="${className}" style="width:100%;height:${height};border-radius:12px;overflow:hidden;margin-bottom:10px;position:relative;">
      <img
        src="${firstImage}"
        style="width:100%;height:100%;object-fit:cover;"
        onerror="this.onerror=null;this.parentElement.innerHTML='<div style=\"width:100%;height:100%;background:linear-gradient(135deg,#e8f5e9,#c8e6c9);display:flex;flex-direction:column;align-items:center;justify-content:center;\"><i class=\"material-icons\" style=\"font-size:48px;color:var(--primary);\">broken_image</i><span style=\"font-size:12px;color:var(--primary);margin-top:4px;\">Image Error</span></div>';"
      >
      ${images.length > 1
        ? `<span class="badge" style="position:absolute;bottom:8px;right:8px;background:rgba(0,0,0,.6);color:#fff;font-size:11px;">+${images.length - 1}</span>`
        : ""
      }
    </div>
  `;
}


/*
============================================================
IMAGE SLIDER HTML (for Product Details)
============================================================
*/

function productImageSliderHTML(product) {
  const images = getProductImages(product);
  PRODUCT_IMAGE_SLIDE = 0;

  if (images.length === 0) {
    return `
      <div class="imageSliderContainer">
        <div style="width:100%;height:250px;background:linear-gradient(135deg,#e8f5e9,#c8e6c9);border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;">
          <i class="material-icons" style="font-size:64px;color:var(--primary);">image</i>
          <span style="color:var(--primary);margin-top:8px;">No Images</span>
        </div>
      </div>
    `;
  }

  let html = `
    <div class="imageSliderContainer" id="productImageSlider">
      <div class="sliderMain">
        <div class="sliderTrack" id="sliderTrack" style="display:flex;overflow:hidden;border-radius:12px;position:relative;">
  `;

  images.forEach((img, index) => {
    html += `
      <div class="sliderSlide ${index === 0 ? 'active' : ''}" data-index="${index}" style="min-width:100%;display:${index === 0 ? 'block' : 'none'};position:relative;">
        <img
          src="${img}"
          style="width:100%;height:250px;object-fit:cover;cursor:pointer;"
          onclick="openProductFullScreen('${img}')"
          onerror="this.onerror=null;this.parentElement.innerHTML='<div style=\"width:100%;height:250px;background:#f5f5f5;display:flex;align-items:center;justify-content:center;\"><i class=\"material-icons\" style=\"font-size:48px;color:#999;\">broken_image</i></div>';"
        >
      </div>
    `;
  });

  // Slider controls
  if (images.length > 1) {
    html += `
        </div>

        <button class="sliderArrow sliderArrowLeft" onclick="slideProductImage(-1)" style="position:absolute;top:50%;left:8px;transform:translateY(-50%);width:auto;padding:8px 12px;background:rgba(0,0,0,.4);color:#fff;border:none;border-radius:50%;cursor:pointer;font-size:20px;z-index:5;">
          ‹
        </button>

        <button class="sliderArrow sliderArrowRight" onclick="slideProductImage(1)" style="position:absolute;top:50%;right:8px;transform:translateY(-50%);width:auto;padding:8px 12px;background:rgba(0,0,0,.4);color:#fff;border:none;border-radius:50%;cursor:pointer;font-size:20px;z-index:5;">
          ›
        </button>

        <div class="sliderDots" style="position:absolute;bottom:10px;left:50%;transform:translateX(-50%);display:flex;gap:6px;z-index:5;">
    `;

    images.forEach((_, index) => {
      html += `<span class="sliderDot ${index === 0 ? 'active' : ''}" data-index="${index}" onclick="goToProductSlide(${index})" style="width:8px;height:8px;border-radius:50%;background:${index === 0 ? '#fff' : 'rgba(255,255,255,.5)'};cursor:pointer;display:inline-block;"></span>`;
    });

    html += `
        </div>

        <div class="slideCounter" style="position:absolute;top:10px;right:10px;background:rgba(0,0,0,.5);color:#fff;padding:4px 10px;border-radius:15px;font-size:12px;z-index:5;">
          <span id="productSlideCounter">1</span> / ${images.length}
        </div>
      </div>

      <!-- Thumbnails -->
      <div class="sliderThumbnails" style="display:flex;gap:8px;margin-top:10px;overflow-x:auto;padding-bottom:4px;">
    `;

    images.forEach((img, index) => {
      html += `
        <img
          src="${img}"
          class="thumbImg ${index === 0 ? 'active' : ''}"
          data-index="${index}"
          onclick="goToProductSlide(${index})"
          style="width:60px;height:60px;object-fit:cover;border-radius:8px;cursor:pointer;border:${index === 0 ? '2px solid var(--primary)' : '2px solid transparent'};opacity:${index === 0 ? '1' : '.6'};"
          onerror="this.onerror=null;this.style.display='none';"
        >
      `;
    });

    html += `</div>`;
  } else {
    html += `</div>`;
  }

  html += `</div>`;

  return html;
}


/*
============================================================
SLIDER NAVIGATION
============================================================
*/

function slideProductImage(direction) {
  const slides = document.querySelectorAll("#productImageSlider .sliderSlide");
  const dots = document.querySelectorAll("#productImageSlider .sliderDot");
  const thumbs = document.querySelectorAll("#productImageSlider .thumbImg");
  const counter = document.getElementById("productSlideCounter");

  if (slides.length === 0) return;

  // Hide current
  slides.forEach(s => s.style.display = "none");

  PRODUCT_IMAGE_SLIDE = (PRODUCT_IMAGE_SLIDE + direction + slides.length) % slides.length;

  // Show new
  slides[PRODUCT_IMAGE_SLIDE].style.display = "block";

  // Update dots
  dots.forEach((d, i) => {
    d.style.background = i === PRODUCT_IMAGE_SLIDE ? "#fff" : "rgba(255,255,255,.5)";
  });

  // Update thumbs
  thumbs.forEach((t, i) => {
    t.style.border = i === PRODUCT_IMAGE_SLIDE ? "2px solid var(--primary)" : "2px solid transparent";
    t.style.opacity = i === PRODUCT_IMAGE_SLIDE ? "1" : ".6";
  });

  // Update counter
  if (counter) counter.innerText = PRODUCT_IMAGE_SLIDE + 1;
}


function goToProductSlide(index) {
  const slides = document.querySelectorAll("#productImageSlider .sliderSlide");
  const dots = document.querySelectorAll("#productImageSlider .sliderDot");
  const thumbs = document.querySelectorAll("#productImageSlider .thumbImg");
  const counter = document.getElementById("productSlideCounter");

  if (slides.length === 0) return;

  slides.forEach(s => s.style.display = "none");
  PRODUCT_IMAGE_SLIDE = index;
  slides[PRODUCT_IMAGE_SLIDE].style.display = "block";

  dots.forEach((d, i) => {
    d.style.background = i === PRODUCT_IMAGE_SLIDE ? "#fff" : "rgba(255,255,255,.5)";
  });

  thumbs.forEach((t, i) => {
    t.style.border = i === PRODUCT_IMAGE_SLIDE ? "2px solid var(--primary)" : "2px solid transparent";
    t.style.opacity = i === PRODUCT_IMAGE_SLIDE ? "1" : ".6";
  });

  if (counter) counter.innerText = PRODUCT_IMAGE_SLIDE + 1;
}


/*
============================================================
FULL SCREEN VIEWER
============================================================
*/

function openProductFullScreen(imageUrl) {
  if (!imageUrl) return;

  let viewer = document.getElementById("productFsViewer");
  if (!viewer) {
    viewer = document.createElement("div");
    viewer.id = "productFsViewer";
    viewer.className = "fullScreenViewer";
    document.body.appendChild(viewer);
  }

  viewer.innerHTML = `
    <span class="fsCloseBtn" onclick="closeProductFullScreen()">&times;</span>
    <img src="${imageUrl}" class="fsImage" onerror="this.onerror=null;this.parentElement.innerHTML='<span class=\"fsCloseBtn\" onclick=\"closeProductFullScreen()\">&times;</span><div style=\"color:#fff;text-align:center;font-size:18px;\">Image could not be loaded.</div>';">
  `;

  viewer.style.display = "flex";
}


function closeProductFullScreen() {
  const viewer = document.getElementById("productFsViewer");
  if (viewer) viewer.style.display = "none";
}


/*
============================================================
CLOSE FULL SCREEN ON ESC
============================================================
*/

document.addEventListener("keydown", function(e) {
  if (e.key === "Escape") {
    closeProductFullScreen();
  }
});