/**
 * ============================================================
 * EKKA1KM BACKEND
 * GPS.js
 * V4.2.1
 * ============================================================
 */

function calculateDistance(
  lat1,
  lng1,
  lat2,
  lng2
) {
  const R = 6371;

  const dLat =
    (lat2 - lat1) *
    Math.PI / 180;

  const dLng =
    (lng2 - lng1) *
    Math.PI / 180;

  const a =
    Math.sin(dLat / 2) *
      Math.sin(dLat / 2) +
    Math.cos(
      lat1 *
        Math.PI /
        180
    ) *
      Math.cos(
        lat2 *
          Math.PI /
          180
      ) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );

  return R * c;
}


function filterByRadius(
  data,
  userLat,
  userLng,
  radius
) {

  if (
    !userLat ||
    !userLng ||
    !radius
  ) {
    return data;
  }

  if (
    String(radius)
      .toLowerCase() ===
    "all india"
  ) {
    return data;
  }

  radius =
    Number(radius);

  return data.filter(
    function (item) {

      const lat =
        Number(
          item.Latitude ||
            item.latitude
        );

      const lng =
        Number(
          item.Longitude ||
            item.longitude
        );

      if (
        !lat ||
        !lng
      ) {
        return false;
      }

      const distance =
        calculateDistance(
          Number(userLat),
          Number(userLng),
          lat,
          lng
        );

      item.DistanceKm =
        Number(
          distance.toFixed(
            2
          )
        );

      return (
        distance <=
        radius
      );
    }
  );
}

