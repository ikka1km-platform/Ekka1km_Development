/*
============================================================
EKKA1KM FRONTEND
MediaUpload.js
Reusable Media Upload Component
V1.4
Supports: Camera, Gallery, Video, Preview, Compression,
Progress Bar, Cancel, Retry, CORS-safe upload
Uploads via backend proxy to ImageKit
============================================================
*/


/*
============================================================
UPLOAD CONSTRAINTS
============================================================
*/

const UPLOAD_CONSTRAINTS = {
  MAX_IMAGE_SIZE: 5 * 1024 * 1024,
  MAX_VIDEO_SIZE: 25 * 1024 * 1024,
  COMPRESS_THRESHOLD: 2 * 1024 * 1024,
  COMPRESS_QUALITY: 0.7,
  COMPRESS_MAX_WIDTH: 1920,
  COMPRESS_MAX_HEIGHT: 1920,
  ALLOWED_IMAGE_TYPES: ["image/jpeg", "image/jpg", "image/png", "image/webp"],
  ALLOWED_VIDEO_TYPES: ["video/mp4", "video/quicktime", "video/webm"],
  ALLOWED_IMAGE_EXT: ["jpg", "jpeg", "png", "webp"],
  ALLOWED_VIDEO_EXT: ["mp4", "mov", "webm"]
};


/*
============================================================
UPLOAD STATE
============================================================
*/

const UPLOAD_STATE = {
  selectedFile: null,
  previewUrl: null,
  isUploading: false,
  isCancelled: false,
  uploadedUrl: null,
  uploadedFileId: null,
  fileType: null,
  abortController: null
};


/*
============================================================
RESET UPLOAD STATE
============================================================
*/

function resetUploadState() {
  if (UPLOAD_STATE.abortController) {
    try { UPLOAD_STATE.abortController.abort(); } catch(e) {}
  }
  UPLOAD_STATE.selectedFile = null;
  UPLOAD_STATE.previewUrl = null;
  UPLOAD_STATE.isUploading = false;
  UPLOAD_STATE.isCancelled = false;
  UPLOAD_STATE.uploadedUrl = null;
  UPLOAD_STATE.uploadedFileId = null;
  UPLOAD_STATE.fileType = null;
  UPLOAD_STATE.abortController = null;
}


/*
============================================================
VALIDATE FILE
============================================================
*/

function validateFile(file) {
  if (!file) {
    return { valid: false, error: "No file selected." };
  }

  const isImage = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");

  if (!isImage && !isVideo) {
    return { valid: false, error: "Unsupported file type. Use JPG, PNG, WebP (images) or MP4, MOV, WebM (videos)." };
  }

  if (isImage) {
    const ext = file.name.split(".").pop().toLowerCase();
    if (!UPLOAD_CONSTRAINTS.ALLOWED_IMAGE_EXT.includes(ext)) {
      return { valid: false, error: "Image format not supported. Use JPG, PNG, or WebP." };
    }
    if (file.size > UPLOAD_CONSTRAINTS.MAX_IMAGE_SIZE) {
      return { valid: false, error: `Image too large. Max 5 MB. Your file: ${(file.size / 1024 / 1024).toFixed(1)} MB` };
    }
  }

  if (isVideo) {
    const ext = file.name.split(".").pop().toLowerCase();
    if (!UPLOAD_CONSTRAINTS.ALLOWED_VIDEO_EXT.includes(ext)) {
      return { valid: false, error: "Video format not supported. Use MP4, MOV, or WebM." };
    }
    if (file.size > UPLOAD_CONSTRAINTS.MAX_VIDEO_SIZE) {
      return { valid: false, error: `Video too large. Max 25 MB. Your file: ${(file.size / 1024 / 1024).toFixed(1)} MB` };
    }
  }

  return { valid: true, error: null };
}


/*
============================================================
COMPRESS IMAGE
============================================================
*/

function compressImage(file, onProgress) {
  return new Promise((resolve) => {
    if (file.size <= UPLOAD_CONSTRAINTS.COMPRESS_THRESHOLD) {
      resolve({ file: file, compressed: false });
      return;
    }

    if (onProgress) onProgress(10, "Compressing image...");

    const reader = new FileReader();
    reader.onload = function(e) {
      if (onProgress) onProgress(20, "Processing image...");

      const img = new Image();
      img.onload = function() {
        if (onProgress) onProgress(30, "Resizing image...");

        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > UPLOAD_CONSTRAINTS.COMPRESS_MAX_WIDTH || height > UPLOAD_CONSTRAINTS.COMPRESS_MAX_HEIGHT) {
          const ratio = Math.min(
            UPLOAD_CONSTRAINTS.COMPRESS_MAX_WIDTH / width,
            UPLOAD_CONSTRAINTS.COMPRESS_MAX_HEIGHT / height
          );
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        if (onProgress) onProgress(50, "Compressing...");

        let quality = UPLOAD_CONSTRAINTS.COMPRESS_QUALITY;
        let compressed = canvas.toDataURL("image/jpeg", quality);

        while (compressed.length > UPLOAD_CONSTRAINTS.COMPRESS_THRESHOLD * 1.37 && quality > 0.2) {
          quality = Math.round((quality - 0.1) * 10) / 10;
          compressed = canvas.toDataURL("image/jpeg", quality);
        }

        if (onProgress) onProgress(80, "Finalizing...");

        const byteString = atob(compressed.split(",")[1]);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([ab], { type: "image/jpeg" });
        const compressedFile = new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), {
          type: "image/jpeg",
          lastModified: Date.now()
        });

        console.log(`Image compressed: ${(file.size / 1024).toFixed(0)}KB → ${(compressedFile.size / 1024).toFixed(0)}KB`);
        if (onProgress) onProgress(100, "Compression done");
        resolve({ file: compressedFile, compressed: true });
      };
      img.onerror = function() {
        resolve({ file: file, compressed: false });
      };
      img.src = e.target.result;
    };
    reader.onerror = function() {
      resolve({ file: file, compressed: false });
    };
    reader.readAsDataURL(file);
  });
}


/*
============================================================
CREATE UPLOAD WIDGET HTML
============================================================
*/

function createUploadWidget(containerId, options) {
  const opts = Object.assign({
    folder: "uploads",
    accept: "image/*",
    multiple: false,
    showPreview: true,
    onUpload: null,
    label: "Upload Image"
  }, options);

  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <div class="uploadWidget" id="uploadWidget_${containerId}">
      <div class="uploadLabel">${opts.label}</div>
      <div class="uploadActions">
        <button class="uploadBtn" onclick="triggerCamera('${containerId}')" style="flex:1;">
          <i class="material-icons" style="font-size:18px;vertical-align:middle;">camera_alt</i> Camera
        </button>
        <button class="uploadBtn" onclick="triggerGallery('${containerId}')" style="flex:1;">
          <i class="material-icons" style="font-size:18px;vertical-align:middle;">photo_library</i> Gallery
        </button>
        <button class="uploadBtn" onclick="triggerVideo('${containerId}')" style="flex:1;">
          <i class="material-icons" style="font-size:18px;vertical-align:middle;">videocam</i> Video
        </button>
      </div>
      <input type="file" id="fileInput_${containerId}" accept="${opts.accept}" style="display:none;" onchange="handleFileSelected(event, '${containerId}')">
      <div id="previewArea_${containerId}" class="uploadPreview" style="display:none;"></div>
      <div id="progressArea_${containerId}" class="progressArea" style="display:none;">
        <div class="progressBarContainer">
          <div id="progressBar_${containerId}" class="progressBarFill" style="width:0%;"></div>
        </div>
        <div id="progressText_${containerId}" class="progressText">Preparing...</div>
        <div class="progressActions">
          <button id="cancelBtn_${containerId}" class="progressCancelBtn" onclick="cancelUpload('${containerId}')">
            <i class="material-icons" style="font-size:16px;vertical-align:middle;">cancel</i> Cancel
          </button>
          <button id="retryBtn_${containerId}" class="progressRetryBtn" style="display:none;" onclick="retryUpload('${containerId}')">
            <i class="material-icons" style="font-size:16px;vertical-align:middle;">refresh</i> Retry
          </button>
        </div>
      </div>
      <div id="uploadStatus_${containerId}" class="uploadStatus"></div>
      <div id="uploadResult_${containerId}" class="uploadResult" style="display:none;"></div>
    </div>
  `;

  container.dataset.uploadFolder = opts.folder;
  container._uploadCallback = opts.onUpload;
}


/*
============================================================
TRIGGER CAMERA / GALLERY / VIDEO
============================================================
*/

function triggerCamera(containerId) {
  const input = document.getElementById("fileInput_" + containerId);
  if (!input) return;
  input.accept = "image/*";
  input.setAttribute("capture", "environment");
  input.click();
}

function triggerGallery(containerId) {
  const input = document.getElementById("fileInput_" + containerId);
  if (!input) return;
  input.accept = "image/*";
  input.removeAttribute("capture");
  input.click();
}

function triggerVideo(containerId) {
  const input = document.getElementById("fileInput_" + containerId);
  if (!input) return;
  input.accept = "video/*";
  input.removeAttribute("capture");
  input.click();
}


/*
============================================================
HANDLE FILE SELECTED
============================================================
*/

async function handleFileSelected(event, containerId) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  resetUploadState();
  hideResult(containerId);

  const validation = validateFile(file);
  if (!validation.valid) {
    const statusArea = document.getElementById("uploadStatus_" + containerId);
    if (statusArea) {
      statusArea.innerHTML = `<div class="uploadError">❌ ${validation.error}</div>`;
    }
    event.target.value = "";
    return;
  }

  UPLOAD_STATE.selectedFile = file;
  UPLOAD_STATE.isCancelled = false;

  const isVideo = file.type.startsWith("video/");
  UPLOAD_STATE.fileType = isVideo ? "video" : "image";

  const previewArea = document.getElementById("previewArea_" + containerId);
  if (previewArea) {
    const reader = new FileReader();
    reader.onload = function(e) {
      UPLOAD_STATE.previewUrl = e.target.result;

      if (isVideo) {
        previewArea.innerHTML = `
          <div class="previewContainer">
            <video controls style="width:100%;max-height:220px;border-radius:12px;">
              <source src="${e.target.result}" type="${file.type}">
            </video>
            <div class="previewInfo">
              <span class="previewFilename">${file.name}</span>
              <span class="previewSize">${(file.size / 1024 / 1024).toFixed(1)} MB</span>
            </div>
          </div>
        `;
      } else {
        previewArea.innerHTML = `
          <div class="previewContainer">
            <img src="${e.target.result}" class="previewImage">
            <div class="previewInfo">
              <span class="previewFilename">${file.name}</span>
              <span class="previewSize">${(file.size / 1024 / 1024).toFixed(1)} MB</span>
            </div>
          </div>
        `;
      }
      previewArea.style.display = "block";
    };
    reader.readAsDataURL(file);
  }

  await uploadFile(containerId);
}


/*
============================================================
PROGRESS BAR HELPERS
============================================================
*/

function updateProgress(containerId, percent, text) {
  if (UPLOAD_STATE.isCancelled) return;

  const bar = document.getElementById("progressBar_" + containerId);
  const textEl = document.getElementById("progressText_" + containerId);
  const cancelBtn = document.getElementById("cancelBtn_" + containerId);
  const retryBtn = document.getElementById("retryBtn_" + containerId);
  const progressArea = document.getElementById("progressArea_" + containerId);

  if (progressArea) progressArea.style.display = "block";
  if (bar) bar.style.width = Math.min(percent, 100) + "%";
  if (textEl) textEl.innerText = text || `${Math.min(percent, 100)}%`;
  if (cancelBtn) cancelBtn.style.display = "inline-flex";
  if (retryBtn) retryBtn.style.display = "none";
}

function showErrorState(containerId, errorMsg) {
  const bar = document.getElementById("progressBar_" + containerId);
  const textEl = document.getElementById("progressText_" + containerId);
  const cancelBtn = document.getElementById("cancelBtn_" + containerId);
  const retryBtn = document.getElementById("retryBtn_" + containerId);

  if (bar) { bar.style.width = "100%"; bar.style.background = "#d32f2f"; }
  if (textEl) { textEl.innerHTML = `❌ ${errorMsg}`; textEl.style.color = "#d32f2f"; }
  if (cancelBtn) cancelBtn.style.display = "none";
  if (retryBtn) retryBtn.style.display = "inline-flex";
}

function hideResult(containerId) {
  const resultArea = document.getElementById("uploadResult_" + containerId);
  if (resultArea) { resultArea.style.display = "none"; resultArea.innerHTML = ""; }

  const statusArea = document.getElementById("uploadStatus_" + containerId);
  if (statusArea) statusArea.innerHTML = "";

  const progressArea = document.getElementById("progressArea_" + containerId);
  if (progressArea) progressArea.style.display = "none";

  const bar = document.getElementById("progressBar_" + containerId);
  if (bar) { bar.style.width = "0%"; bar.style.background = "var(--primary)"; }

  const textEl = document.getElementById("progressText_" + containerId);
  if (textEl) { textEl.style.color = "#555"; }
}


/*
============================================================
CANCEL / RETRY
============================================================
*/

function cancelUpload(containerId) {
  UPLOAD_STATE.isCancelled = true;
  if (UPLOAD_STATE.abortController) {
    try { UPLOAD_STATE.abortController.abort(); } catch(e) {}
  }

  const bar = document.getElementById("progressBar_" + containerId);
  const textEl = document.getElementById("progressText_" + containerId);
  const cancelBtn = document.getElementById("cancelBtn_" + containerId);
  const retryBtn = document.getElementById("retryBtn_" + containerId);
  const statusArea = document.getElementById("uploadStatus_" + containerId);

  if (bar) bar.style.width = "0%";
  if (textEl) textEl.innerText = "Cancelled";
  if (cancelBtn) cancelBtn.style.display = "none";
  if (retryBtn) { retryBtn.style.display = "inline-flex"; retryBtn.innerHTML = '<i class="material-icons" style="font-size:16px;vertical-align:middle;">refresh</i> Retry'; }
  if (statusArea) statusArea.innerHTML = `<div class="uploadError">⛔ Upload cancelled</div>`;

  UPLOAD_STATE.isUploading = false;
}

function retryUpload(containerId) {
  const bar = document.getElementById("progressBar_" + containerId);
  if (bar) bar.style.background = "var(--primary)";

  const textEl = document.getElementById("progressText_" + containerId);
  if (textEl) textEl.style.color = "#555";

  const statusArea = document.getElementById("uploadStatus_" + containerId);
  if (statusArea) statusArea.innerHTML = "";

  UPLOAD_STATE.isCancelled = false;
  UPLOAD_STATE.abortController = null;

  uploadFile(containerId);
}


/*
============================================================
UPLOAD FILE TO IMAGEKIT VIA BACKEND
============================================================
* 
* CORS-SAFE APPROACH:
* 
* Google Apps Script parses the query string into e.parameter
* for both GET and POST requests. Form-encoded POST body data
* is also available in e.parameter.
* 
* To ensure the action is ALWAYS captured, we put it in the URL
* query string. The base64 data goes in the POST body to avoid
* URL length limits.
*/

async function uploadFile(containerId) {
  let file = UPLOAD_STATE.selectedFile;
  if (!file) return;

  UPLOAD_STATE.isUploading = true;
  UPLOAD_STATE.isCancelled = false;
  UPLOAD_STATE.abortController = new AbortController();
  const signal = UPLOAD_STATE.abortController.signal;

  try {
    // Step 1: Compress if needed
    if (file.type.startsWith("image/") && file.size > UPLOAD_CONSTRAINTS.COMPRESS_THRESHOLD) {
      const result = await compressImage(file, (pct, msg) => {
        if (!UPLOAD_STATE.isCancelled) updateProgress(containerId, pct * 0.3, msg);
      });
      if (UPLOAD_STATE.isCancelled) return;
      if (result.compressed) {
        file = result.file;
        UPLOAD_STATE.selectedFile = file;
      }
    }

    if (UPLOAD_STATE.isCancelled) return;

    updateProgress(containerId, 35, "Preparing for upload...");
    const base64 = await fileToBase64(file);
    const base64Data = base64.split(",")[1] || base64;

    if (UPLOAD_STATE.isCancelled) return;

    updateProgress(containerId, 50, "Uploading to server...");

    const ext = file.name.split(".").pop() || "jpg";
    const fileName = Date.now() + "_" + Math.random().toString(36).substring(2, 8) + "." + ext;
    const container = document.getElementById(containerId);
    const folder = container ? (container.dataset.uploadFolder || "uploads") : "uploads";

    updateProgress(containerId, 60, "Sending to ImageKit...");

    /*
     * ============================================================
     * FIX: Put action in the URL query string so GAS can always
     * read it from e.parameter.action. This works reliably for
     * both GET and POST requests regardless of Content-Type.
     *
     * Base64 data goes in POST body as form-encoded (no custom
     * headers = no CORS preflight).
     * ============================================================
     */

    const formData = new URLSearchParams();
    formData.append("base64", base64Data);
    formData.append("fileName", fileName);
    formData.append("folder", folder);

    const url = `${getApiUrl()}?action=upload`;

    const response = await fetch(url, {
      method: "POST",
      body: formData.toString(),
      signal: signal
    });

    if (UPLOAD_STATE.isCancelled) return;

    updateProgress(containerId, 85, "Processing response...");

    const json = await response.json();

    if (json.success || json.status === "SUCCESS") {
      const data = json.data || {};
      UPLOAD_STATE.uploadedUrl = data.url;
      UPLOAD_STATE.uploadedFileId = data.fileId;

      updateProgress(containerId, 100, "✅ Upload complete!");

      const statusArea = document.getElementById("uploadStatus_" + containerId);
      if (statusArea) statusArea.innerHTML = `<div class="uploadSuccess">✅ Upload successful!</div>`;

      const resultArea = document.getElementById("uploadResult_" + containerId);
      if (resultArea) {
        resultArea.style.display = "block";
        resultArea.innerHTML = `
          <div class="uploadResultBox">
            <strong>ImageKit URL:</strong>
            <input type="text" value="${data.url}" readonly onclick="this.select()" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:8px;font-size:12px;margin-top:4px;background:#f9f9f9;">
            <div style="display:flex;gap:8px;margin-top:8px;">
              <button onclick="copyUploadUrl('${containerId}')" style="flex:1;padding:8px;font-size:13px;">
                <i class="material-icons" style="font-size:16px;vertical-align:middle;">content_copy</i> Copy URL
              </button>
              <button onclick="resetUploadWidget('${containerId}')" class="btn-gray" style="flex:1;padding:8px;font-size:13px;">
                <i class="material-icons" style="font-size:16px;vertical-align:middle;">add</i> Upload New
              </button>
            </div>
          </div>
        `;
      }

      const cancelBtn = document.getElementById("cancelBtn_" + containerId);
      const retryBtn = document.getElementById("retryBtn_" + containerId);
      if (cancelBtn) cancelBtn.style.display = "none";
      if (retryBtn) retryBtn.style.display = "none";

      if (container && container._uploadCallback) {
        container._uploadCallback(data.url, data.fileId);
      }
    } else {
      showErrorState(containerId, json.message || "Upload failed");
    }

  } catch (err) {
    if (err.name === "AbortError" || UPLOAD_STATE.isCancelled) return;
    console.log("Upload error:", err);
    showErrorState(containerId, "Connection error. Check network.");
  }

  UPLOAD_STATE.isUploading = false;
}


/*
============================================================
RESET UPLOAD WIDGET
============================================================
*/

function resetUploadWidget(containerId) {
  resetUploadState();

  const previewArea = document.getElementById("previewArea_" + containerId);
  if (previewArea) { previewArea.style.display = "none"; previewArea.innerHTML = ""; }

  const resultArea = document.getElementById("uploadResult_" + containerId);
  if (resultArea) { resultArea.style.display = "none"; resultArea.innerHTML = ""; }

  const statusArea = document.getElementById("uploadStatus_" + containerId);
  if (statusArea) statusArea.innerHTML = "";

  const progressArea = document.getElementById("progressArea_" + containerId);
  if (progressArea) progressArea.style.display = "none";

  const bar = document.getElementById("progressBar_" + containerId);
  if (bar) { bar.style.width = "0%"; bar.style.background = "var(--primary)"; }

  const textEl = document.getElementById("progressText_" + containerId);
  if (textEl) { textEl.innerText = "Preparing..."; textEl.style.color = "#555"; }

  const cancelBtn = document.getElementById("cancelBtn_" + containerId);
  const retryBtn = document.getElementById("retryBtn_" + containerId);
  if (cancelBtn) cancelBtn.style.display = "inline-flex";
  if (retryBtn) retryBtn.style.display = "none";

  const input = document.getElementById("fileInput_" + containerId);
  if (input) input.value = "";
}


/*
============================================================
HELPERS
============================================================
*/

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function copyUploadUrl(containerId) {
  const resultArea = document.getElementById("uploadResult_" + containerId);
  if (!resultArea) return;
  const input = resultArea.querySelector("input");
  if (input) {
    input.select();
    document.execCommand("copy");
    alert("URL copied to clipboard!");
  }
}


/*
============================================================
TEST UPLOAD PAGE
============================================================
*/

function openUploadTest() {
  openPage("uploadTest");
  createUploadWidget("uploadTestWidget", {
    folder: "test",
    label: "Test Upload - Choose an image or video",
    onUpload: function(url, fileId) {
      console.log("Upload complete:", url, fileId);
    }
  });
}