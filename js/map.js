// map.js — the D3 map engine: flat (Equal Earth) + globe (Orthographic) views,
// pan/zoom, drag-to-rotate, microstate markers, status fills, scope dimming,
// pulses/flashes, and continent framing. Uses window.d3 (classic script tag).

const FILL_STATUSES = ["untouched", "wrong", "almost", "mastered"];
const MARKER_DOT_RADIUS = 3.2;
const MARKER_HIT_RADIUS = 6;
const CAPITAL_DOT_RADIUS = 1.5;
const CAPITAL_ZOOM_THRESHOLD = 2.5; // capital dots appear past this zoom-in factor
const MAP_PADDING = 14;

export function createMapEngine({ svgElement, geojson, regions, capitalsByRegionId, callbacks, isReducedMotion }) {
  const d3 = window.d3;

  // ----- region lookups -----

  const regionById = new Map(regions.map((region) => [region.id, region]));

  function resolveEffectiveRegion(regionId) {
    let region = regionById.get(regionId);
    let hops = 0;
    while (region && region.status === "fold" && region.foldInto && hops < 5) {
      region = regionById.get(region.foldInto);
      hops += 1;
    }
    return region || null;
  }

  const effectiveIdByFeatureId = new Map();
  for (const feature of geojson.features) {
    const effective = resolveEffectiveRegion(feature.properties.id);
    effectiveIdByFeatureId.set(feature.properties.id, effective ? effective.id : feature.properties.id);
  }
  const effectiveIdOf = (feature) => effectiveIdByFeatureId.get(feature.properties.id);

  let activeContinentScope = "World";
  let microstatesIncluded = true;
  function isFeatureIdOutOfScope(effectiveRegionId) {
    const region = regionById.get(effectiveRegionId);
    if (!microstatesIncluded && region && region.microstate) return true;
    if (activeContinentScope === "World") return false;
    return !region || region.continent !== activeContinentScope;
  }

  // Anchor = centroid of the feature's largest polygon (by spherical area).
  function largestPolygonCentroid(feature) {
    const geometry = feature.geometry;
    if (geometry.type !== "MultiPolygon") return d3.geoCentroid(feature);
    let largest = null;
    let largestArea = -1;
    for (const polygonCoordinates of geometry.coordinates) {
      const polygon = { type: "Polygon", coordinates: polygonCoordinates };
      const area = d3.geoArea(polygon);
      if (area > largestArea) {
        largestArea = area;
        largest = polygon;
      }
    }
    return d3.geoCentroid(largest);
  }

  const anchorByRegionId = new Map();
  for (const feature of geojson.features) {
    anchorByRegionId.set(feature.properties.id, largestPolygonCentroid(feature));
  }

  // Angular radius = farthest vertex from the anchor, so globe rendering can
  // skip a feature only when no part of it can possibly be visible.
  const angularRadiusByFeatureId = new Map();
  for (const feature of geojson.features) {
    const anchor = anchorByRegionId.get(feature.properties.id);
    let radius = 0;
    const visit = (coords) => {
      if (typeof coords[0] === "number") {
        radius = Math.max(radius, d3.geoDistance(anchor, coords));
      } else {
        for (const child of coords) visit(child);
      }
    };
    visit(feature.geometry.coordinates);
    angularRadiusByFeatureId.set(feature.properties.id, radius);
  }

  // ----- sizing and projections -----

  let width = svgElement.clientWidth || 1100;
  let height = svgElement.clientHeight || 700;

  const flatProjection = d3.geoEqualEarth();
  const globeProjection = d3.geoOrthographic().clipAngle(90).rotate([0, -12]);
  let baseGlobeScale = 0; // 0 = not yet fitted; fitProjections() sets the real value

  function fitProjections() {
    const extent = [
      [MAP_PADDING, MAP_PADDING],
      [width - MAP_PADDING, height - MAP_PADDING],
    ];
    flatProjection.fitExtent(extent, { type: "Sphere" });
    const globeZoomRatio = baseGlobeScale > 0 ? globeProjection.scale() / baseGlobeScale : 1;
    globeProjection.fitExtent(extent, { type: "Sphere" });
    baseGlobeScale = globeProjection.scale();
    globeProjection.scale(baseGlobeScale * globeZoomRatio);
  }
  fitProjections();

  let activeView = "flat";
  let pathGenerator = d3.geoPath(flatProjection);

  // ----- static DOM -----

  const svg = d3.select(svgElement).attr("viewBox", `0 0 ${width} ${height}`);

  const defs = svg.append("defs");
  const hatchPattern = defs
    .append("pattern")
    .attr("id", "untouched-hatch")
    .attr("patternUnits", "userSpaceOnUse")
    .attr("width", 5)
    .attr("height", 5);
  hatchPattern.append("rect").attr("width", 5).attr("height", 5).attr("fill", "var(--color-land-untouched)");
  hatchPattern
    .append("path")
    .attr("d", "M-1,1 l2,-2 M0,5 l5,-5 M4,6 l2,-2")
    .attr("stroke", "var(--color-land-hatch)")
    .attr("stroke-width", 0.5);

  const zoomLayer = svg.append("g").attr("class", "zoom-layer");

  const sphereFill = zoomLayer
    .append("path")
    .datum({ type: "Sphere" })
    .attr("class", "sphere-fill")
    .attr("vector-effect", "non-scaling-stroke");

  const graticulePath = zoomLayer
    .append("path")
    .datum(d3.geoGraticule10())
    .attr("class", "graticule")
    .attr("vector-effect", "non-scaling-stroke");

  const countriesGroup = zoomLayer.append("g").attr("class", "countries");
  // Preserve file order: overlay features come last and must paint on top.
  const countryPaths = countriesGroup
    .selectAll("path")
    .data(geojson.features)
    .join("path")
    .attr("class", "country status-untouched")
    .attr("vector-effect", "non-scaling-stroke");

  const sphereOutline = zoomLayer
    .append("path")
    .datum({ type: "Sphere" })
    .attr("class", "sphere-outline")
    .attr("vector-effect", "non-scaling-stroke");

  const markerData = regions.filter(
    (region) => region.microstate && anchorByRegionId.has(region.id)
  );
  const markersGroup = zoomLayer.append("g").attr("class", "microstate-markers");
  const markerGroups = markersGroup
    .selectAll("g")
    .data(markerData)
    .join("g")
    .attr("class", "microstate-marker status-untouched");
  markerGroups
    .append("circle")
    .attr("class", "marker-halo")
    .attr("r", MARKER_HIT_RADIUS);
  markerGroups
    .append("circle")
    .attr("class", "marker-dot")
    .attr("r", MARKER_DOT_RADIUS)
    .attr("vector-effect", "non-scaling-stroke");

  // Capital dots: every non-microstate region with known capital coordinates
  // (a microstate's ring already marks roughly its capital). Zoom-gated —
  // meaningless at world view — and pointer-events: none in CSS, so they can
  // never steal a hover or click from the country under them.
  const capitalDotData = regions
    .filter((region) => !region.microstate && capitalsByRegionId[region.id])
    .map((region) => ({ id: region.id, lngLat: capitalsByRegionId[region.id] }));
  const capitalsGroup = zoomLayer.append("g").attr("class", "capital-dots");
  const capitalDots = capitalsGroup
    .selectAll("circle")
    .data(capitalDotData)
    .join("circle")
    .attr("class", "capital-dot")
    .attr("r", CAPITAL_DOT_RADIUS)
    .attr("vector-effect", "non-scaling-stroke");

  function capitalDotsVisible() {
    return activeView === "flat"
      ? currentZoomTransform.k >= CAPITAL_ZOOM_THRESHOLD
      : globeProjection.scale() >= baseGlobeScale * CAPITAL_ZOOM_THRESHOLD;
  }

  function updateCapitalDotsDisplay() {
    capitalsGroup.attr("display", capitalDotsVisible() ? null : "none");
  }

  // ----- interaction wiring -----

  countryPaths
    .on("pointerenter", (event, feature) => {
      setHoverClasses(effectiveIdOf(feature), true);
      callbacks.onRegionHovered(effectiveIdOf(feature));
    })
    .on("pointerleave", (event, feature) => {
      setHoverClasses(effectiveIdOf(feature), false);
      callbacks.onRegionHovered(null);
    })
    .on("click", (event, feature) => {
      event.stopPropagation();
      callbacks.onRegionClicked(effectiveIdOf(feature));
    });

  markerGroups
    .on("pointerenter", (event, region) => {
      const effective = resolveEffectiveRegion(region.id);
      setHoverClasses(effective ? effective.id : region.id, true);
      callbacks.onRegionHovered(effective ? effective.id : region.id);
    })
    .on("pointerleave", (event, region) => {
      const effective = resolveEffectiveRegion(region.id);
      setHoverClasses(effective ? effective.id : region.id, false);
      callbacks.onRegionHovered(null);
    })
    .on("click", (event, region) => {
      event.stopPropagation();
      const effective = resolveEffectiveRegion(region.id);
      callbacks.onRegionClicked(effective ? effective.id : region.id);
    });

  sphereFill.on("click", () => callbacks.onBackgroundClicked());

  function setHoverClasses(effectiveRegionId, hovered) {
    countryPaths.filter((feature) => effectiveIdOf(feature) === effectiveRegionId).classed("hovered", hovered);
    markerGroups
      .filter((region) => {
        const effective = resolveEffectiveRegion(region.id);
        return (effective ? effective.id : region.id) === effectiveRegionId;
      })
      .classed("hovered", hovered);
  }

  // Selects country paths + markers belonging to one effective region.
  function selectionsForRegion(effectiveRegionId) {
    return {
      paths: countryPaths.filter((feature) => effectiveIdOf(feature) === effectiveRegionId),
      markers: markerGroups.filter((region) => {
        const effective = resolveEffectiveRegion(region.id);
        return (effective ? effective.id : region.id) === effectiveRegionId;
      }),
    };
  }

  // ----- flat zoom behavior -----

  let currentZoomTransform = d3.zoomIdentity;

  // The first zoom event of a gesture updates the SVG directly; from the
  // second on, the gesture is clearly a pan/zoom (not a click or a one-shot
  // programmatic transform) and frames move to the canvas overlay.
  let zoomGestureEventCount = 0;

  const zoomBehavior = d3
    .zoom()
    .scaleExtent([1, 12])
    .translateExtent([
      [0, 0],
      [width, height],
    ])
    .clickDistance(4)
    .on("start", () => {
      zoomGestureEventCount = 0;
    })
    .on("zoom", (event) => {
      currentZoomTransform = event.transform;
      zoomGestureEventCount += 1;
      if (zoomGestureEventCount >= 2 || canvasInteractionActive) {
        beginCanvasInteraction();
        drawInteractionFrame();
      } else {
        zoomLayer.attr("transform", event.transform);
        compensateZoomScale(event.transform.k);
      }
    })
    .on("end", () => {
      if (canvasInteractionActive) endCanvasInteraction(0);
    });

  // d3-zoom only applies translateExtent inside its own gesture handlers;
  // zoomBehavior.transform sets a transform verbatim. Programmatic transforms
  // must be clamped by hand or the next user gesture snaps the view back.
  function constrainTransform(transform) {
    const scale = transform.k;
    const x = Math.min(0, Math.max(width * (1 - scale), transform.x));
    const y = Math.min(0, Math.max(height * (1 - scale), transform.y));
    return d3.zoomIdentity.translate(x, y).scale(scale);
  }

  // Markers keep constant screen size; the hatch pattern keeps constant pitch.
  // Rescaling the hatch pattern forces the browser to re-rasterize the tile,
  // which is too expensive to do on every zoom tick — settle it after the
  // gesture instead (a briefly stale hatch scale is invisible).
  let hatchRescaleTimer = null;
  function compensateZoomScale(zoomScale) {
    markerGroups.select(".marker-dot").attr("r", MARKER_DOT_RADIUS / zoomScale);
    markerGroups.select(".marker-halo").attr("r", MARKER_HIT_RADIUS / zoomScale);
    capitalDots.attr("r", CAPITAL_DOT_RADIUS / zoomScale);
    updateCapitalDotsDisplay();
    clearTimeout(hatchRescaleTimer);
    hatchRescaleTimer = setTimeout(() => {
      hatchPattern.attr("patternTransform", `scale(${1 / zoomScale})`);
    }, 120);
  }

  // ----- canvas interaction rendering (globe + flat) -----

  // During gestures (globe drag/wheel/rotation, flat pan/zoom), frames are
  // drawn to a canvas overlay instead of restyling 253 SVG paths — one cheap
  // bitmap paint per frame. The SVG (with its hatch pattern, transitions, and
  // pulses) is hidden meanwhile and restored crisp on release.
  const GLOBE_CRISP_PRECISION = Math.sqrt(0.5); // d3's default
  const GLOBE_INTERACTING_PRECISION = 3;
  let canvasInteractionActive = false;
  let canvasInteractionEndTimer = null;

  const interactionCanvas = document.createElement("canvas");
  interactionCanvas.className = "interaction-canvas";
  svgElement.parentNode.insertBefore(interactionCanvas, svgElement.nextSibling);
  const canvasContext = interactionCanvas.getContext("2d");
  const graticuleDatum = d3.geoGraticule10();

  function sizeInteractionCanvas() {
    const pixelRatio = window.devicePixelRatio || 1;
    interactionCanvas.width = width * pixelRatio;
    interactionCanvas.height = height * pixelRatio;
    canvasContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  }
  sizeInteractionCanvas();

  const rootStyles = getComputedStyle(document.documentElement);
  const canvasColors = {
    ocean: rootStyles.getPropertyValue("--color-ocean").trim(),
    coastline: rootStyles.getPropertyValue("--color-coastline").trim(),
    graticule: "rgba(91, 70, 54, 0.18)", // matches .graticule in styles.css
    capitalHalo: rootStyles.getPropertyValue("--color-parchment-bright").trim(),
    fillByStatus: {
      untouched: rootStyles.getPropertyValue("--color-land-untouched").trim(),
      wrong: rootStyles.getPropertyValue("--color-status-wrong").trim(),
      almost: rootStyles.getPropertyValue("--color-status-almost").trim(),
      mastered: rootStyles.getPropertyValue("--color-status-mastered").trim(),
    },
  };

  // Flat geometry never changes between resizes, so flat frames reuse cached
  // Path2D objects — per frame the canvas just transforms and refills them.
  let flatSpherePath2D = null;
  let flatGraticulePath2D = null;
  let flatFeaturePath2DById = null;

  function invalidateFlatPathCache() {
    flatSpherePath2D = null;
    flatGraticulePath2D = null;
    flatFeaturePath2DById = null;
  }

  function ensureFlatPathCache() {
    if (flatFeaturePath2DById) return;
    const flatPathToString = d3.geoPath(flatProjection);
    flatSpherePath2D = new Path2D(flatPathToString({ type: "Sphere" }));
    flatGraticulePath2D = new Path2D(flatPathToString(graticuleDatum));
    flatFeaturePath2DById = new Map();
    for (const feature of geojson.features) {
      flatFeaturePath2DById.set(feature.properties.id, new Path2D(flatPathToString(feature) || ""));
    }
  }

  function statusFillFor(featureOrRegionId) {
    const status = previousStatusByFeature.get(featureOrRegionId) || "untouched";
    return canvasColors.fillByStatus[status] || canvasColors.fillByStatus.untouched;
  }

  function drawInteractionFrame() {
    if (activeView === "globe") drawGlobeFrame();
    else drawFlatFrame();
  }

  function drawGlobeFrame() {
    const canvasPath = d3.geoPath(globeProjection, canvasContext);
    const rotation = globeProjection.rotate();
    const globeCenter = [-rotation[0], -rotation[1]];
    const ctx = canvasContext;
    ctx.clearRect(0, 0, width, height);

    ctx.beginPath();
    canvasPath({ type: "Sphere" });
    ctx.fillStyle = canvasColors.ocean;
    ctx.fill();

    ctx.beginPath();
    canvasPath(graticuleDatum);
    ctx.strokeStyle = canvasColors.graticule;
    ctx.lineWidth = 0.5;
    ctx.stroke();

    ctx.lineWidth = 0.6;
    ctx.strokeStyle = canvasColors.coastline;
    for (const feature of geojson.features) {
      const featureId = feature.properties.id;
      const anchorDistance = d3.geoDistance(anchorByRegionId.get(featureId), globeCenter);
      if (anchorDistance - angularRadiusByFeatureId.get(featureId) > Math.PI / 2) continue;
      ctx.globalAlpha = isFeatureIdOutOfScope(effectiveIdOf(feature)) ? 0.3 : 1;
      ctx.beginPath();
      canvasPath(feature);
      ctx.fillStyle = statusFillFor(featureId);
      ctx.fill();
      ctx.stroke();
    }

    ctx.lineWidth = 1; // matches .marker-dot stroke-width in styles.css
    for (const region of markerData) {
      const anchor = anchorByRegionId.get(region.id);
      if (d3.geoDistance(anchor, globeCenter) >= Math.PI / 2) continue;
      const projected = globeProjection(anchor);
      if (!projected) continue;
      const effective = resolveEffectiveRegion(region.id);
      ctx.globalAlpha = isFeatureIdOutOfScope(effective ? effective.id : region.id) ? 0.3 : 1;
      ctx.beginPath();
      ctx.arc(projected[0], projected[1], MARKER_DOT_RADIUS, 0, 2 * Math.PI);
      ctx.fillStyle = statusFillFor(region.id);
      ctx.fill();
      ctx.stroke();
    }

    if (capitalDotsVisible()) {
      ctx.fillStyle = canvasColors.coastline;
      ctx.strokeStyle = canvasColors.capitalHalo;
      ctx.lineWidth = 0.55; // matches .capital-dot stroke in styles.css
      for (const dot of capitalDotData) {
        if (d3.geoDistance(dot.lngLat, globeCenter) >= Math.PI / 2) continue;
        const projected = globeProjection(dot.lngLat);
        if (!projected) continue;
        // matches .capital-dot / .capital-dot.out-of-scope opacity in styles.css
        ctx.globalAlpha = isFeatureIdOutOfScope(dot.id) ? 0.18 : 0.7;
        ctx.beginPath();
        ctx.arc(projected[0], projected[1], CAPITAL_DOT_RADIUS, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
      }
    }

    ctx.globalAlpha = 1;
    ctx.beginPath();
    canvasPath({ type: "Sphere" });
    ctx.lineWidth = 1.1;
    ctx.strokeStyle = canvasColors.coastline;
    ctx.stroke();
  }

  function drawFlatFrame() {
    ensureFlatPathCache();
    const ctx = canvasContext;
    const transform = currentZoomTransform;
    const scale = transform.k;
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(transform.x, transform.y);
    ctx.scale(scale, scale);

    ctx.fillStyle = canvasColors.ocean;
    ctx.fill(flatSpherePath2D);

    ctx.strokeStyle = canvasColors.graticule;
    ctx.lineWidth = 0.5 / scale;
    ctx.stroke(flatGraticulePath2D);

    ctx.lineWidth = 0.6 / scale;
    ctx.strokeStyle = canvasColors.coastline;
    for (const feature of geojson.features) {
      const featureId = feature.properties.id;
      const featurePath = flatFeaturePath2DById.get(featureId);
      ctx.globalAlpha = isFeatureIdOutOfScope(effectiveIdOf(feature)) ? 0.3 : 1;
      ctx.fillStyle = statusFillFor(featureId);
      ctx.fill(featurePath);
      ctx.stroke(featurePath);
    }

    ctx.lineWidth = 1 / scale; // matches .marker-dot stroke-width
    for (const region of markerData) {
      const projected = flatProjection(anchorByRegionId.get(region.id));
      if (!projected) continue;
      const effective = resolveEffectiveRegion(region.id);
      ctx.globalAlpha = isFeatureIdOutOfScope(effective ? effective.id : region.id) ? 0.3 : 1;
      ctx.beginPath();
      ctx.arc(projected[0], projected[1], MARKER_DOT_RADIUS / scale, 0, 2 * Math.PI);
      ctx.fillStyle = statusFillFor(region.id);
      ctx.fill();
      ctx.stroke();
    }

    if (capitalDotsVisible()) {
      ctx.fillStyle = canvasColors.coastline;
      ctx.strokeStyle = canvasColors.capitalHalo;
      ctx.lineWidth = 0.55 / scale; // matches .capital-dot stroke in styles.css
      for (const dot of capitalDotData) {
        const projected = flatProjection(dot.lngLat);
        if (!projected) continue;
        // matches .capital-dot / .capital-dot.out-of-scope opacity in styles.css
        ctx.globalAlpha = isFeatureIdOutOfScope(dot.id) ? 0.18 : 0.7;
        ctx.beginPath();
        ctx.arc(projected[0], projected[1], CAPITAL_DOT_RADIUS / scale, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
      }
    }

    ctx.globalAlpha = 1;
    ctx.lineWidth = 1.1 / scale;
    ctx.strokeStyle = canvasColors.coastline;
    ctx.stroke(flatSpherePath2D);
    ctx.restore();
  }

  function beginCanvasInteraction() {
    clearTimeout(canvasInteractionEndTimer);
    canvasInteractionEndTimer = null;
    if (!canvasInteractionActive) {
      canvasInteractionActive = true;
      if (activeView === "globe") globeProjection.precision(GLOBE_INTERACTING_PRECISION);
      svgElement.classList.add("map-interacting");
      interactionCanvas.style.display = "block";
      drawInteractionFrame();
    }
  }

  function endCanvasInteraction(delayMs) {
    clearTimeout(canvasInteractionEndTimer);
    canvasInteractionEndTimer = setTimeout(() => {
      canvasInteractionEndTimer = null;
      canvasInteractionActive = false;
      globeProjection.precision(GLOBE_CRISP_PRECISION);
      if (activeView === "globe") {
        renderProjectedShapes();
      } else {
        // flat geometry is unchanged — just settle the final transform
        zoomLayer.attr("transform", currentZoomTransform);
        compensateZoomScale(currentZoomTransform.k);
      }
      svgElement.classList.remove("map-interacting");
      interactionCanvas.style.display = "none";
    }, delayMs);
  }

  // ----- globe behaviors -----

  // A plain click must never enter canvas mode: hiding the SVG layer between
  // mousedown and mouseup would retarget the click to the svg root and kill
  // region selection. Mirror clickDistance(4): only begin once the pointer
  // has truly traveled.
  let globeDragTravelX = 0;
  let globeDragTravelY = 0;

  const globeDragBehavior = d3
    .drag()
    .clickDistance(4)
    .on("start", () => {
      // direct manipulation wins over an in-flight programmatic rotation
      svg.interrupt("globe-rotate");
      globeDragTravelX = 0;
      globeDragTravelY = 0;
    })
    .on("drag", (event) => {
      globeDragTravelX += event.dx;
      globeDragTravelY += event.dy;
      if (!canvasInteractionActive && globeDragTravelX ** 2 + globeDragTravelY ** 2 <= 16) return;
      beginCanvasInteraction(); // also cancels an end timer left by a mid-drag wheel
      const rotation = globeProjection.rotate();
      const degreesPerPixel = 75 / globeProjection.scale();
      const longitude = rotation[0] + event.dx * degreesPerPixel;
      const latitude = Math.max(-90, Math.min(90, rotation[1] - event.dy * degreesPerPixel));
      globeProjection.rotate([longitude, latitude]);
      drawInteractionFrame();
    })
    .on("end", () => {
      if (canvasInteractionActive) endCanvasInteraction(0);
    });

  function handleGlobeWheel(event) {
    event.preventDefault();
    svg.interrupt("globe-rotate");
    beginCanvasInteraction();
    const nextScale = Math.max(
      baseGlobeScale * 0.7,
      Math.min(baseGlobeScale * 16, globeProjection.scale() * Math.exp(-event.deltaY * 0.0015))
    );
    globeProjection.scale(nextScale);
    drawInteractionFrame();
    endCanvasInteraction(180);
  }

  function animateGlobeRotation(targetRotation, duration = 900) {
    const start = globeProjection.rotate();
    // take the short way around for longitude
    let longitudeDelta = targetRotation[0] - start[0];
    longitudeDelta = ((longitudeDelta % 360) + 540) % 360 - 180;
    const end = [start[0] + longitudeDelta, targetRotation[1]];
    if (isReducedMotion()) {
      globeProjection.rotate(end);
      renderProjectedShapes();
      return;
    }
    const interpolateRotation = d3.interpolate([start[0], start[1]], end);
    // interrupt the previous tween BEFORE begin, so its end handler's
    // endCanvasInteraction is cancelled rather than killing this tween's mode
    svg.interrupt("globe-rotate");
    beginCanvasInteraction();
    svg
      .transition("globe-rotate")
      .duration(duration)
      .tween("rotate", () => (t) => {
        globeProjection.rotate(interpolateRotation(t));
        drawInteractionFrame();
      })
      .on("end interrupt", () => {
        endCanvasInteraction(0);
      });
  }

  // ----- attach/detach behaviors per view -----

  function applyViewBehaviors() {
    if (activeView === "flat") {
      svg.on(".drag", null);
      svg.on("wheel.globe", null);
      svg.call(zoomBehavior).on("dblclick.zoom", null);
      zoomLayer.attr("transform", currentZoomTransform);
      compensateZoomScale(currentZoomTransform.k);
      pathGenerator = d3.geoPath(flatProjection);
    } else {
      svg.on(".zoom", null);
      svg.call(globeDragBehavior);
      svg.on("wheel.globe", handleGlobeWheel, { passive: false });
      zoomLayer.attr("transform", null);
      compensateZoomScale(1);
      pathGenerator = d3.geoPath(globeProjection);
    }
    svgElement.dataset.view = activeView;
  }

  // ----- rendering -----

  function renderProjectedShapes() {
    const rotation = globeProjection.rotate();
    const globeCenter = [-rotation[0], -rotation[1]];

    sphereFill.attr("d", pathGenerator);
    graticulePath.attr("d", pathGenerator);
    sphereOutline.attr("d", pathGenerator);
    countryPaths.attr("d", (feature) => {
      // on the globe, skip features that cannot reach the visible hemisphere
      if (activeView === "globe") {
        const anchorDistance = d3.geoDistance(anchorByRegionId.get(feature.properties.id), globeCenter);
        if (anchorDistance - angularRadiusByFeatureId.get(feature.properties.id) > Math.PI / 2) return "";
      }
      return pathGenerator(feature) || "";
    });

    const projection = activeView === "flat" ? flatProjection : globeProjection;
    markerGroups.each(function (region) {
      const anchor = anchorByRegionId.get(region.id);
      const onVisibleHemisphere =
        activeView === "flat" || d3.geoDistance(anchor, globeCenter) < Math.PI / 2;
      const projected = projection(anchor);
      d3.select(this)
        .attr("display", onVisibleHemisphere && projected ? null : "none")
        .attr("transform", projected ? `translate(${projected[0]},${projected[1]})` : null);
    });
    capitalDots.each(function (dot) {
      const onVisibleHemisphere =
        activeView === "flat" || d3.geoDistance(dot.lngLat, globeCenter) < Math.PI / 2;
      const projected = projection(dot.lngLat);
      d3.select(this)
        .attr("display", onVisibleHemisphere && projected ? null : "none")
        .attr("transform", projected ? `translate(${projected[0]},${projected[1]})` : null);
    });
    updateCapitalDotsDisplay();
  }

  // ----- public API -----

  function setView(view, { animate = true } = {}) {
    if (view === activeView) return;
    // stop in-flight motion of the view being left, so its interrupt handlers
    // settle the canvas-interaction state before the other view shows
    svg.interrupt(activeView === "globe" ? "globe-rotate" : "frame");
    if (canvasInteractionActive) endCanvasInteraction(0);
    activeView = view;
    if (!animate || isReducedMotion()) {
      applyViewBehaviors();
      renderProjectedShapes();
      return;
    }
    zoomLayer
      .transition("view-crossfade")
      .duration(220)
      .style("opacity", 0)
      .on("end interrupt", () => {
        applyViewBehaviors();
        renderProjectedShapes();
        zoomLayer.transition("view-crossfade").duration(280).style("opacity", 1);
      });
  }

  const previousStatusByFeature = new Map();

  function refreshRegionStatuses(statusByRegionId) {
    countryPaths.each(function (feature) {
      const status = statusByRegionId[effectiveIdOf(feature)] || "untouched";
      const node = d3.select(this);
      const previous = previousStatusByFeature.get(feature.properties.id);
      if (previous !== status) {
        for (const knownStatus of FILL_STATUSES) node.classed(`status-${knownStatus}`, knownStatus === status);
        if (previous !== undefined) {
          node.classed("status-just-changed", false);
          // restart the ink-fill animation
          void this.getBoundingClientRect();
          node.classed("status-just-changed", true);
          setTimeout(() => node.classed("status-just-changed", false), 800);
        }
        previousStatusByFeature.set(feature.properties.id, status);
      }
    });
    markerGroups.each(function (region) {
      const effective = resolveEffectiveRegion(region.id);
      const status = statusByRegionId[effective ? effective.id : region.id] || "untouched";
      const node = d3.select(this);
      for (const knownStatus of FILL_STATUSES) node.classed(`status-${knownStatus}`, knownStatus === status);
    });
  }

  function applyOutOfScopeClasses() {
    countryPaths.classed("out-of-scope", (feature) => isFeatureIdOutOfScope(effectiveIdOf(feature)));
    markerGroups.classed("out-of-scope", (region) => {
      const effective = resolveEffectiveRegion(region.id);
      return isFeatureIdOutOfScope(effective ? effective.id : region.id);
    });
    capitalDots.classed("out-of-scope", (dot) => isFeatureIdOutOfScope(dot.id));
  }

  function setContinentScope(continent) {
    activeContinentScope = continent;
    applyOutOfScopeClasses();
  }

  function setMicrostatesIncluded(included) {
    microstatesIncluded = included;
    applyOutOfScopeClasses();
  }

  function setSelectedRegion(effectiveRegionId) {
    countryPaths.classed("selected", (feature) => effectiveIdOf(feature) === effectiveRegionId);
    markerGroups.classed("selected", (region) => {
      const effective = resolveEffectiveRegion(region.id);
      return (effective ? effective.id : region.id) === effectiveRegionId;
    });
  }

  function setReviewTarget(effectiveRegionId) {
    countryPaths.classed("review-target", (feature) => effectiveIdOf(feature) === effectiveRegionId);
    markerGroups.classed("review-target", (region) => {
      const effective = resolveEffectiveRegion(region.id);
      return (effective ? effective.id : region.id) === effectiveRegionId;
    });
  }

  const timedClassTimers = new Map(); // "regionId|className" -> timeout id

  function addTimedClass(effectiveRegionId, className, durationMs) {
    const { paths, markers } = selectionsForRegion(effectiveRegionId);
    const timerKey = `${effectiveRegionId}|${className}`;
    const pendingTimer = timedClassTimers.get(timerKey);
    if (pendingTimer !== undefined) {
      clearTimeout(pendingTimer);
      paths.classed(className, false);
      markers.classed(className, false);
      // restart the CSS animation
      void svgElement.getBoundingClientRect();
    }
    paths.classed(className, true);
    markers.classed(className, true);
    timedClassTimers.set(
      timerKey,
      setTimeout(() => {
        timedClassTimers.delete(timerKey);
        paths.classed(className, false);
        markers.classed(className, false);
      }, durationMs)
    );
  }

  const pulseRegion = (effectiveRegionId) => addTimedClass(effectiveRegionId, "pulsing", 1800);
  const flashRegion = (effectiveRegionId) => addTimedClass(effectiveRegionId, "flashing", 700);

  // Sustained pulse (no timeout) — Find outcomes use this so the result
  // region keeps pulsing until the round advances. Pass null to clear.
  // Pausable via setSustainedPulsePaused once the user has spotted it.
  let sustainedPulseRegionId = null;

  function setSustainedPulse(effectiveRegionId) {
    if (sustainedPulseRegionId !== null) {
      const { paths, markers } = selectionsForRegion(sustainedPulseRegionId);
      paths.classed("pulsing-sustained", false);
      markers.classed("pulsing-sustained", false);
    }
    sustainedPulseRegionId = effectiveRegionId;
    if (effectiveRegionId !== null) {
      const { paths, markers } = selectionsForRegion(effectiveRegionId);
      paths.classed("pulsing-sustained", true);
      markers.classed("pulsing-sustained", true);
    }
  }

  function setSustainedPulsePaused(paused) {
    if (sustainedPulseRegionId === null) return;
    const { paths, markers } = selectionsForRegion(sustainedPulseRegionId);
    paths.classed("pulsing-sustained", !paused);
    markers.classed("pulsing-sustained", !paused);
  }

  // Frames a continent: flat view zooms to fit, globe view rotates to it.
  function frameContinent(continent, { animate = true } = {}) {
    const durationMs = animate && !isReducedMotion() ? 750 : 0;
    if (activeView === "flat") {
      const targetTransform =
        continent === "World" ? d3.zoomIdentity : flatContinentTransform(continent);
      if (!targetTransform) return;
      if (durationMs === 0) {
        svg.call(zoomBehavior.transform, targetTransform);
        return;
      }
      svg.transition("frame").duration(durationMs).call(zoomBehavior.transform, targetTransform);
    } else {
      if (continent === "World") return;
      const frame = CONTINENT_FRAMES[continent];
      if (!frame) return;
      const [[west, south], [east, north]] = frame;
      const targetRotation = [-(west + east) / 2, -(south + north) / 2];
      if (durationMs === 0) {
        // instant framing (used at boot, so the first-load reveal is not
        // hidden behind a 900ms canvas-mode rotation tween)
        globeProjection.rotate(targetRotation);
        renderProjectedShapes();
        return;
      }
      animateGlobeRotation(targetRotation);
    }
  }

  function flatContinentTransform(continent) {
    const bounds = continentBoundsFlat(continent);
    if (!bounds) return null;
    const [[x0, y0], [x1, y1]] = bounds;
    const scale = Math.min(12, Math.max(1, 0.85 / Math.max((x1 - x0) / width, (y1 - y0) / height)));
    const translate = [width / 2 - (scale * (x0 + x1)) / 2, height / 2 - (scale * (y0 + y1)) / 2];
    return constrainTransform(d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale));
  }

  // Curated lon/lat windows per continent — the frame a wall atlas would use.
  // Deriving frames from feature bounds fails in practice: France's polygon
  // includes French Guiana and Réunion (integral overseas departments), Russia
  // and Fiji cross the antimeridian, so every union-of-bounds zoom degenerates
  // toward the whole world.
  const CONTINENT_FRAMES = {
    Europe: [[-25, 34], [45, 72]],
    Asia: [[25, -12], [150, 78]],
    Africa: [[-20, -36], [52, 38]],
    "North America": [[-170, 5], [-50, 84]],
    "South America": [[-92, -57], [-32, 14]],
    Oceania: [[110, -50], [180, 5]],
  };

  // Projects a continent window to pixel bounds by sampling its border
  // (corners alone miss the curvature of Equal Earth's meridians).
  function continentBoundsFlat(continent) {
    const frame = CONTINENT_FRAMES[continent];
    if (!frame) return null;
    const [[west, south], [east, north]] = frame;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const steps = 24;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const borderPoints = [
        [west + t * (east - west), south],
        [west + t * (east - west), north],
        [west, south + t * (north - south)],
        [east, south + t * (north - south)],
      ];
      for (const point of borderPoints) {
        const projected = flatProjection(point);
        if (!projected || !isFinite(projected[0])) continue;
        x0 = Math.min(x0, projected[0]);
        y0 = Math.min(y0, projected[1]);
        x1 = Math.max(x1, projected[0]);
        y1 = Math.max(y1, projected[1]);
      }
    }
    return isFinite(x0) ? [[x0, y0], [x1, y1]] : null;
  }

  // Brings a region on screen: flat pans to it if off-view; globe rotates to it.
  function ensureRegionVisible(effectiveRegionId) {
    const anchor = anchorByRegionId.get(effectiveRegionId);
    if (!anchor) return;
    if (activeView === "flat") {
      const projected = flatProjection(anchor);
      if (!projected) return;
      const onScreen = currentZoomTransform.apply(projected);
      const margin = 40;
      const visible =
        onScreen[0] > margin && onScreen[0] < width - margin && onScreen[1] > margin && onScreen[1] < height - margin;
      if (visible) return;
      const scale = currentZoomTransform.k;
      svg
        .transition("frame")
        .duration(isReducedMotion() ? 0 : 700)
        .call(
          zoomBehavior.transform,
          constrainTransform(
            d3.zoomIdentity.translate(width / 2 - scale * projected[0], height / 2 - scale * projected[1]).scale(scale)
          )
        );
    } else {
      const rotation = globeProjection.rotate();
      const distanceFromCenter = d3.geoDistance(anchor, [-rotation[0], -rotation[1]]);
      if (distanceFromCenter > Math.PI / 3) animateGlobeRotation([-anchor[0], -anchor[1]]);
    }
  }

  function playFirstLoadReveal() {
    svgElement.classList.add("map-loaded");
    if (isReducedMotion()) return;
    countryPaths
      .style("animation-delay", (feature, index) => `${Math.min(index * 5, 1100)}ms`)
      .classed("first-reveal", true);
    setTimeout(() => {
      countryPaths.classed("first-reveal", false).style("animation-delay", null);
    }, 2400);
  }

  function resize() {
    width = svgElement.clientWidth || width;
    height = svgElement.clientHeight || height;
    svg.attr("viewBox", `0 0 ${width} ${height}`);
    fitProjections();
    zoomBehavior.translateExtent([
      [0, 0],
      [width, height],
    ]);
    if (activeView === "flat") {
      // re-constrain the existing transform against the new extent
      svg.call(zoomBehavior.transform, constrainTransform(currentZoomTransform));
    }
    sizeInteractionCanvas();
    invalidateFlatPathCache(); // flat projection was refitted
    renderProjectedShapes();
    // resizing the canvas backing store wipes it — repaint mid-gesture frames
    if (canvasInteractionActive) drawInteractionFrame();
  }

  // ----- initial paint -----

  applyViewBehaviors();
  renderProjectedShapes();
  window.addEventListener("resize", resize);

  return {
    setView,
    refreshRegionStatuses,
    setContinentScope,
    setMicrostatesIncluded,
    setSelectedRegion,
    setReviewTarget,
    pulseRegion,
    flashRegion,
    setSustainedPulse,
    setSustainedPulsePaused,
    frameContinent,
    ensureRegionVisible,
    playFirstLoadReveal,
    setInitialView(view) {
      if (view !== activeView) {
        activeView = view;
        applyViewBehaviors();
        renderProjectedShapes();
      }
    },
  };
}
