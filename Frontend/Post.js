/*
============================================================
EKKA1KM FRONTEND
Post.js
Floating Post Button + Post Forms
V1.0
============================================================
*/


/*
============================================================
TOGGLE FLOATING MENU
============================================================
*/

function toggleFloatingMenu() {
  const menu = document.getElementById("floatingMenu");
  const overlay = document.getElementById("floatingOverlay");

  if (!menu) return;

  const isOpen = menu.classList.contains("open");

  if (isOpen) {
    menu.classList.remove("open");
    if (overlay) overlay.style.display = "none";
  } else {
    menu.classList.add("open");
    if (overlay) overlay.style.display = "block";
  }
}


/*
============================================================
CLOSE FLOATING MENU
============================================================
*/

function closeFloatingMenu() {
  const menu = document.getElementById("floatingMenu");
  const overlay = document.getElementById("floatingOverlay");

  if (menu) menu.classList.remove("open");
  if (overlay) overlay.style.display = "none";
}


/*
============================================================
OPEN POST FORM
============================================================
*/

function openPostForm(formType) {
  closeFloatingMenu();

  if (!requireLogin()) {
    return;
  }

  switch (formType) {
    case "product":
      openPage("postProduct");
      break;
    case "property":
      openPage("postProperty");
      break;
    case "business":
      openPage("postBusiness");
      break;
    case "news":
      openPage("postNews");
      break;
    case "advertisement":
      openPage("postAdvertisement");
      break;
    case "promotion":
      openPage("postPromotion");
      break;
    default:
      break;
  }
}


/*
============================================================
POST PRODUCT
============================================================
*/

async function submitProduct() {
  const userId = getUserId();
  if (!userId) return;

  const title = document.getElementById("prodTitle").value.trim();
  const description = document.getElementById("prodDesc").value.trim();
  const price = document.getElementById("prodPrice").value.trim();
  const category = document.getElementById("prodCategory").value.trim();
  const condition = document.getElementById("prodCondition").value;
  const brand = document.getElementById("prodBrand").value.trim();
  const model = document.getElementById("prodModel").value.trim();
  const imageUrl = document.getElementById("prodImage").value.trim();
  const city = document.getElementById("prodCity").value.trim();
  const state = document.getElementById("prodState").value.trim();
  const pincode = document.getElementById("prodPincode").value.trim();
  const phone = document.getElementById("prodPhone").value.trim();
  const whatsapp = document.getElementById("prodWhatsapp").value.trim();
  const delivery = document.getElementById("prodDelivery").value;
  const cod = document.getElementById("prodCOD").value;
  const negotiable = document.getElementById("prodNegotiable").value;

  if (!title || !price) {
    alert("Title and Price are required.");
    return;
  }

  try {
    const url = `${getApiUrl()}?action=addproduct`
      + `&userId=${encodeURIComponent(userId)}`
      + `&title=${encodeURIComponent(title)}`
      + `&description=${encodeURIComponent(description)}`
      + `&price=${encodeURIComponent(price)}`
      + `&category=${encodeURIComponent(category)}`
      + `&condition=${encodeURIComponent(condition)}`
      + `&brand=${encodeURIComponent(brand)}`
      + `&model=${encodeURIComponent(model)}`
      + `&imageURL=${encodeURIComponent(imageUrl)}`
      + `&city=${encodeURIComponent(city)}`
      + `&state=${encodeURIComponent(state)}`
      + `&pincode=${encodeURIComponent(pincode)}`
      + `&phone=${encodeURIComponent(phone)}`
      + `&whatsapp=${encodeURIComponent(whatsapp)}`
      + `&delivery=${encodeURIComponent(delivery)}`
      + `&cod=${encodeURIComponent(cod)}`
      + `&negotiable=${encodeURIComponent(negotiable)}`
      + `&lat=${CURRENT_LAT}&lng=${CURRENT_LNG}`;

    const response = await fetch(url);
    const json = await response.json();

    if (json.success || json.status === "SUCCESS") {
      alert("Product posted successfully!");
      clearPostForm("product");
      openPage("products");
      loadProducts();
    } else {
      alert(json.message || "Failed to post product.");
    }
  } catch (err) {
    console.log(err);
    alert("Unable to post product. Check connection.");
  }
}


/*
============================================================
POST PROPERTY
============================================================
*/

async function submitProperty() {
  const userId = getUserId();
  if (!userId) return;

  const propertyType = document.getElementById("propType").value;
  const purpose = document.getElementById("propPurpose").value;
  const title = document.getElementById("propTitle").value.trim();
  const description = document.getElementById("propDesc").value.trim();
  const price = document.getElementById("propPrice").value.trim();
  const bedrooms = document.getElementById("propBedrooms").value.trim();
  const bathrooms = document.getElementById("propBathrooms").value.trim();
  const area = document.getElementById("propArea").value.trim();
  const images = document.getElementById("propImages").value.trim();
  const address = document.getElementById("propAddress").value.trim();
  const city = document.getElementById("propCity").value.trim();
  const district = document.getElementById("propDistrict").value.trim();
  const state = document.getElementById("propState").value.trim();

  if (!title || !price) {
    alert("Title and Price are required.");
    return;
  }

  try {
    const url = `${getApiUrl()}?action=addproperty`
      + `&ownerUserID=${encodeURIComponent(userId)}`
      + `&propertyType=${encodeURIComponent(propertyType)}`
      + `&purpose=${encodeURIComponent(purpose)}`
      + `&title=${encodeURIComponent(title)}`
      + `&description=${encodeURIComponent(description)}`
      + `&price=${encodeURIComponent(price)}`
      + `&bedrooms=${encodeURIComponent(bedrooms)}`
      + `&bathrooms=${encodeURIComponent(bathrooms)}`
      + `&area=${encodeURIComponent(area)}`
      + `&images=${encodeURIComponent(images)}`
      + `&address=${encodeURIComponent(address)}`
      + `&city=${encodeURIComponent(city)}`
      + `&district=${encodeURIComponent(district)}`
      + `&state=${encodeURIComponent(state)}`
      + `&lat=${CURRENT_LAT}&lng=${CURRENT_LNG}`;

    const response = await fetch(url);
    const json = await response.json();

    if (json.success || json.status === "SUCCESS") {
      alert("Property posted successfully!");
      clearPostForm("property");
      openPage("home");
    } else {
      alert(json.message || "Failed to post property.");
    }
  } catch (err) {
    console.log(err);
    alert("Unable to post property. Check connection.");
  }
}


/*
============================================================
POST BUSINESS
============================================================
*/

async function submitBusiness() {
  const userId = getUserId();
  if (!userId) return;

  const businessName = document.getElementById("bizName").value.trim();
  const category = document.getElementById("bizCategory").value.trim();
  const description = document.getElementById("bizDesc").value.trim();
  const phone = document.getElementById("bizPhone").value.trim();
  const whatsapp = document.getElementById("bizWhatsapp").value.trim();
  const email = document.getElementById("bizEmail").value.trim();
  const address = document.getElementById("bizAddress").value.trim();
  const city = document.getElementById("bizCity").value.trim();
  const state = document.getElementById("bizState").value.trim();
  const pincode = document.getElementById("bizPincode").value.trim();
  const openingTime = document.getElementById("bizOpen").value.trim();
  const closingTime = document.getElementById("bizClose").value.trim();

  if (!businessName) {
    alert("Business Name is required.");
    return;
  }

  try {
    const url = `${getApiUrl()}?action=addbusiness`
      + `&ownerUserID=${encodeURIComponent(userId)}`
      + `&businessName=${encodeURIComponent(businessName)}`
      + `&category=${encodeURIComponent(category)}`
      + `&description=${encodeURIComponent(description)}`
      + `&phone=${encodeURIComponent(phone)}`
      + `&whatsapp=${encodeURIComponent(whatsapp)}`
      + `&email=${encodeURIComponent(email)}`
      + `&address=${encodeURIComponent(address)}`
      + `&city=${encodeURIComponent(city)}`
      + `&state=${encodeURIComponent(state)}`
      + `&pincode=${encodeURIComponent(pincode)}`
      + `&openingTime=${encodeURIComponent(openingTime)}`
      + `&closingTime=${encodeURIComponent(closingTime)}`
      + `&lat=${CURRENT_LAT}&lng=${CURRENT_LNG}`;

    const response = await fetch(url);
    const json = await response.json();

    if (json.success || json.status === "SUCCESS") {
      alert("Business created successfully!");
      clearPostForm("business");
      openPage("businesses");
      loadBusinesses();
    } else {
      alert(json.message || "Failed to create business.");
    }
  } catch (err) {
    console.log(err);
    alert("Unable to create business. Check connection.");
  }
}


/*
============================================================
POST NEWS
============================================================
*/

async function submitNews() {
  const userId = getUserId();
  if (!userId) return;

  const title = document.getElementById("newsTitle").value.trim();
  const content = document.getElementById("newsContent").value.trim();
  const category = document.getElementById("newsCategory").value.trim();
  const imageUrl = document.getElementById("newsImage").value.trim();
  const city = document.getElementById("newsCity").value.trim();

  if (!title || !content) {
    alert("Title and Content are required.");
    return;
  }

  try {
    const url = `${getApiUrl()}?action=addnews`
      + `&userId=${encodeURIComponent(userId)}`
      + `&title=${encodeURIComponent(title)}`
      + `&content=${encodeURIComponent(content)}`
      + `&category=${encodeURIComponent(category)}`
      + `&imageURL=${encodeURIComponent(imageUrl)}`
      + `&city=${encodeURIComponent(city)}`
      + `&lat=${CURRENT_LAT}&lng=${CURRENT_LNG}`;

    const response = await fetch(url);
    const json = await response.json();

    if (json.success || json.status === "SUCCESS") {
      alert("News submitted for review!");
      clearPostForm("news");
      openPage("news");
      loadNews();
    } else {
      alert(json.message || "Failed to submit news.");
    }
  } catch (err) {
    console.log(err);
    alert("Unable to submit news. Check connection.");
  }
}


/*
============================================================
POST ADVERTISEMENT
============================================================
*/

async function submitAdvertisement() {
  const userId = getUserId();
  if (!userId) return;

  const title = document.getElementById("adTitle").value.trim();
  const description = document.getElementById("adDesc").value.trim();
  const imageUrl = document.getElementById("adImage").value.trim();
  const externalUrl = document.getElementById("adExternal").value.trim();
  const adType = document.getElementById("adType").value;
  const city = document.getElementById("adCity").value.trim();

  if (!title) {
    alert("Title is required.");
    return;
  }

  try {
    const url = `${getApiUrl()}?action=addadvertisement`
      + `&userId=${encodeURIComponent(userId)}`
      + `&title=${encodeURIComponent(title)}`
      + `&description=${encodeURIComponent(description)}`
      + `&imageURL=${encodeURIComponent(imageUrl)}`
      + `&externalURL=${encodeURIComponent(externalUrl)}`
      + `&adType=${encodeURIComponent(adType)}`
      + `&city=${encodeURIComponent(city)}`
      + `&lat=${CURRENT_LAT}&lng=${CURRENT_LNG}`;

    const response = await fetch(url);
    const json = await response.json();

    if (json.success || json.status === "SUCCESS") {
      alert("Advertisement submitted for review!");
      clearPostForm("advertisement");
      openPage("home");
    } else {
      alert(json.message || "Failed to submit advertisement.");
    }
  } catch (err) {
    console.log(err);
    alert("Unable to submit advertisement. Check connection.");
  }
}


/*
============================================================
POST PROMOTION CAMPAIGN
============================================================
*/

async function submitPromotion() {
  const userId = getUserId();
  if (!userId) return;

  const campaignType = document.getElementById("promoType").value;
  const targetType = document.getElementById("promoTargetType").value;
  const targetId = document.getElementById("promoTargetId").value.trim();
  const coinsSpent = document.getElementById("promoCoins").value.trim();
  const radius = document.getElementById("promoRadius").value;
  const city = document.getElementById("promoCity").value.trim();
  const startDate = document.getElementById("promoStart").value.trim();
  const endDate = document.getElementById("promoEnd").value.trim();

  if (!coinsSpent || !startDate || !endDate) {
    alert("Coins, Start Date and End Date are required.");
    return;
  }

  try {
    const url = `${getApiUrl()}?action=addcampaign`
      + `&campaignType=${encodeURIComponent(campaignType)}`
      + `&ownerUserID=${encodeURIComponent(userId)}`
      + `&targetType=${encodeURIComponent(targetType)}`
      + `&targetID=${encodeURIComponent(targetId)}`
      + `&coinsSpent=${encodeURIComponent(coinsSpent)}`
      + `&radius=${encodeURIComponent(radius)}`
      + `&city=${encodeURIComponent(city)}`
      + `&startDate=${encodeURIComponent(startDate)}`
      + `&endDate=${encodeURIComponent(endDate)}`
      + `&lat=${CURRENT_LAT}&lng=${CURRENT_LNG}`;

    const response = await fetch(url);
    const json = await response.json();

    if (json.success || json.status === "SUCCESS") {
      alert("Promotion campaign created!");
      clearPostForm("promotion");
      openPage("home");
    } else {
      alert(json.message || "Failed to create campaign.");
    }
  } catch (err) {
    console.log(err);
    alert("Unable to create campaign. Check connection.");
  }
}


/*
============================================================
CLEAR POST FORM
============================================================
*/

function clearPostForm(formType) {
  const formMap = {
    product: [
      "prodTitle","prodDesc","prodPrice","prodCategory",
      "prodBrand","prodModel","prodImage","prodCity",
      "prodState","prodPincode","prodPhone","prodWhatsapp"
    ],
    property: [
      "propTitle","propDesc","propPrice","propBedrooms",
      "propBathrooms","propArea","propImages","propAddress",
      "propCity","propDistrict","propState"
    ],
    business: [
      "bizName","bizCategory","bizDesc","bizPhone",
      "bizWhatsapp","bizEmail","bizAddress","bizCity",
      "bizState","bizPincode","bizOpen","bizClose"
    ],
    news: [
      "newsTitle","newsContent","newsCategory","newsImage","newsCity"
    ],
    advertisement: [
      "adTitle","adDesc","adImage","adExternal","adCity"
    ],
    promotion: [
      "promoTargetId","promoCoins","promoCity","promoStart","promoEnd"
    ]
  };

  const fields = formMap[formType] || [];
  fields.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
}