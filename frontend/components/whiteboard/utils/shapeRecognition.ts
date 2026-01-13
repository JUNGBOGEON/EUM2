import { Point } from '../types';

interface ShapeResult {
    type: 'circle' | 'rectangle' | 'triangle' | 'none';
    score: number;
    correctedPoints?: Point[];
}

// --- $1 Unistroke Recognizer Implementation ---
// Reference: http://depts.washington.edu/madlab/proj/dollar/index.html

const NumPoints = 64;
const SquareSize = 250.0;
const Origin = { x: 0, y: 0 };
const Diagonal = Math.sqrt(SquareSize * SquareSize + SquareSize * SquareSize);
const HalfDiagonal = 0.5 * Diagonal;
const AngleRange = 45.0 * (Math.PI / 180.0);
const AnglePrecision = 2.0 * (Math.PI / 180.0);
const Phi = 0.5 * (-1.0 + Math.sqrt(5.0)); // Golden Ratio

// --- Templates ---
class Template {
    name: string;
    points: Point[];
    vector: number[];

    constructor(name: string, points: Point[]) {
        this.name = name;
        this.points = resample(points, NumPoints);
        const radians = indicativeAngle(this.points);
        this.points = rotateBy(this.points, -radians);
        this.points = scaleTo(this.points, SquareSize);
        this.points = translateTo(this.points, Origin);
        this.vector = vectorIze(this.points);
    }
}

// Defined Templates (Rectangle, Circle, Triangle)
// Ideally these should be loaded once, but for simplicity we define them here or lazily.
let _templates: Template[] | null = null;
function getTemplates(): Template[] {
    if (_templates) return _templates;

    // Rectangle (CW)
    const rectPointsCW = [
        { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }, { x: 0, y: 0 }
    ];
    // Rectangle (CCW)
    const rectPointsCCW = [...rectPointsCW].reverse();

    // Triangle (CW) - Top -> Right -> Left -> Top
    const triPointsCW = [
        { x: 50, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }, { x: 50, y: 0 }
    ];
    // Triangle (CCW) - Top -> Left -> Right -> Top
    const triPointsCCW = [...triPointsCW].reverse();

    // Circle (CW)
    const circlePointsCW: Point[] = [];
    for (let i = 0; i <= 60; i++) {
        const t = (i / 60) * 2 * Math.PI;
        circlePointsCW.push({ x: 50 + 50 * Math.cos(t), y: 50 + 50 * Math.sin(t) });
    }
    // Circle (CCW)
    const circlePointsCCW = [...circlePointsCW].reverse();

    _templates = [
        new Template('rectangle', rectPointsCW),
        new Template('rectangle', rectPointsCCW),
        new Template('triangle', triPointsCW),
        new Template('triangle', triPointsCCW),
        new Template('circle', circlePointsCW),
        new Template('circle', circlePointsCCW)
    ];
    return _templates;
}


// --- Geometric Helper Functions ---

function dist(p1: Point, p2: Point) {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
}

function pathLength(points: Point[]) {
    let d = 0.0;
    for (let i = 1; i < points.length; i++) {
        d += dist(points[i - 1], points[i]);
    }
    return d;
}

function resample(points: Point[], n: number) {
    const I = pathLength(points) / (n - 1);
    let D = 0.0;
    const newPoints = [points[0]];
    for (let i = 1; i < points.length; i++) {
        let d = dist(points[i - 1], points[i]);
        if ((D + d) >= I) {
            const qx = points[i - 1].x + ((I - D) / d) * (points[i].x - points[i - 1].x);
            const qy = points[i - 1].y + ((I - D) / d) * (points[i].y - points[i - 1].y);
            const q = { x: qx, y: qy };
            newPoints.push(q);
            points.splice(i, 0, q);
            D = 0.0;
        } else {
            D += d;
        }
    }
    if (newPoints.length === n - 1) {
        newPoints.push(points[points.length - 1]);
    }
    return newPoints;
}

function indicativeAngle(points: Point[]) {
    const c = centroid(points);
    return Math.atan2(c.y - points[0].y, c.x - points[0].x);
}

function rotateBy(points: Point[], radians: number) {
    const c = centroid(points);
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const newPoints = [];
    for (let i = 0; i < points.length; i++) {
        const qx = (points[i].x - c.x) * cos - (points[i].y - c.y) * sin + c.x;
        const qy = (points[i].x - c.x) * sin + (points[i].y - c.y) * cos + c.y;
        newPoints.push({ x: qx, y: qy });
    }
    return newPoints;
}

function scaleTo(points: Point[], size: number) {
    const B = boundingBox(points);
    const newPoints = [];
    for (let i = 0; i < points.length; i++) {
        const qx = points[i].x * (size / B.width);
        const qy = points[i].y * (size / B.height);
        newPoints.push({ x: qx, y: qy });
    }
    return newPoints;
}

function translateTo(points: Point[], pt: Point) {
    const c = centroid(points);
    const newPoints = [];
    for (let i = 0; i < points.length; i++) {
        const qx = points[i].x + pt.x - c.x;
        const qy = points[i].y + pt.y - c.y;
        newPoints.push({ x: qx, y: qy });
    }
    return newPoints;
}

function vectorIze(points: Point[]) {
    let sum = 0.0;
    const vector = [];
    for (const p of points) {
        vector.push(p.x);
        vector.push(p.y);
        sum += p.x * p.x + p.y * p.y;
    }
    const magnitude = Math.sqrt(sum);
    for (let i = 0; i < vector.length; i++) {
        vector[i] /= magnitude;
    }
    return vector;
}

function centroid(points: Point[]) {
    let x = 0.0, y = 0.0;
    for (const p of points) {
        x += p.x;
        y += p.y;
    }
    x /= points.length;
    y /= points.length;
    return { x, y };
}

function boundingBox(points: Point[]) {
    let minX = +Infinity, maxX = -Infinity, minY = +Infinity, maxY = -Infinity;
    for (const p of points) {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
    }
    return { minX, minY, width: maxX - minX, height: maxY - minY };
}

function distanceAtBestAngle(points: Point[], T: Template, a: number, b: number, threshold: number): number {
    let x1 = Phi * a + (1.0 - Phi) * b;
    let f1 = distanceAtAngle(points, T, x1);
    let x2 = (1.0 - Phi) * a + Phi * b;
    let f2 = distanceAtAngle(points, T, x2);
    while (Math.abs(b - a) > threshold) {
        if (f1 < f2) {
            b = x2;
            x2 = x1;
            f2 = f1;
            x1 = Phi * a + (1.0 - Phi) * b;
            f1 = distanceAtAngle(points, T, x1);
        } else {
            a = x1;
            x1 = x2;
            f1 = f2;
            x2 = (1.0 - Phi) * a + Phi * b;
            f2 = distanceAtAngle(points, T, x2);
        }
    }
    return Math.min(f1, f2);
}

function distanceAtAngle(points: Point[], T: Template, radians: number) {
    const newPoints = rotateBy(points, radians);
    return pathDistance(newPoints, T.points);
}

function pathDistance(pts1: Point[], pts2: Point[]) {
    let d = 0.0;
    for (let i = 0; i < pts1.length; i++) {
        d += dist(pts1[i], pts2[i]);
    }
    return d / pts1.length;
}

// --- Corrected Shape Generation ---
// Generate a perfect shape matching the user's bounding box and rotation.

function generateCorrectedShape(type: string, userPoints: Point[], bestAngle: number): Point[] {
    const userBox = boundingBox(userPoints);
    const center = centroid(userPoints);

    // 1. Create unit shape centered at 0,0
    let points: Point[] = [];
    if (type === 'rectangle') {
        points = [
            { x: -0.5, y: -0.5 }, { x: 0.5, y: -0.5 },
            { x: 0.5, y: 0.5 }, { x: -0.5, y: 0.5 },
            { x: -0.5, y: -0.5 }
        ];
    } else if (type === 'triangle') {
        // Equilateral triangle
        const h = Math.sqrt(3) / 2;
        points = [
            { x: 0, y: -0.577 }, // Top (approx)
            { x: 0.5, y: 0.289 }, // Bottom right
            { x: -0.5, y: 0.289 }, // Bottom left
            { x: 0, y: -0.577 }
        ];
    } else if (type === 'circle') {
        for (let i = 0; i <= 60; i++) {
            const t = (i / 60) * 2 * Math.PI;
            points.push({ x: 0.5 * Math.cos(t), y: 0.5 * Math.sin(t) });
        }
    }

    // 2. Scale to match user's AABB size (approximation)
    // Note: If user drew a rotated shape, "userBox" is the AABB of the rotated shape, which is larger.
    // However, correcting the scale perfectly for rotation is complex without PCA.
    // For now, we just scale it to the AABB. This might make 45-deg rects look a bit larger, but it's acceptable.
    // A better way is: use the $1 scale factor? $1 scales to square.
    // Let's stick to AABB scaling for reliability.

    const scaledPoints = points.map(p => ({
        x: p.x * userBox.width,
        y: p.y * userBox.height
    }));

    // 3. Rotate by the detected angle (bestAngle)
    // Wait, distanceAtBestAngle returns distance, not the angle. 
    // And "bestAngle" passed to this function needs to be derived.
    // The standard $1 implementation finds the angle maximizing the score.
    // We need to modify "recognize" to return the angle difference if we want to use it.
    // BUT! $1 rotates the CANDIDATE to match the template (at 0).
    // So if check is rotated +30deg, we rotate it -30deg to match.
    // So the shape is rotated +30deg relative to template.
    // Ideally we preserve the user's rotation or snap to 0/90 if close?

    // For now, let's just center it.
    // If the user wants rotation, we need to extract that angle.
    // Simple approach: Use getBoundingBox of original points.

    const finalPoints = scaledPoints.map(p => ({
        x: p.x + center.x,
        y: p.y + center.y
    }));

    return finalPoints;
}

// --- Main Function ---

export const detectShape = (points: Point[]): ShapeResult => {
    if (points.length < 10) return { type: 'none', score: 0 };

    // 1. Preprocess
    let candidate = resample(points, NumPoints);
    const radians = indicativeAngle(candidate);
    candidate = rotateBy(candidate, -radians);
    candidate = scaleTo(candidate, SquareSize);
    candidate = translateTo(candidate, Origin);

    // 2. Match
    const templates = getTemplates();
    let bestDist = Infinity;
    let bestTemplate: Template | null = null;
    let bestAngleFound = 0;

    for (const T of templates) {
        // Golden Section Search for best angle
        // We can just use the straightforward distanceAtBestAngle
        // But to Capture the angle, we might need to expand it or just assume 0 if we assume user draws upright?
        // No, user draws rotated.

        // Let's trust the AABB for final rendering for now (simpler)
        // Or better: Implement a simplified "Best Angle" return.

        const d = distanceAtBestAngle(candidate, T, -AngleRange, AngleRange, AnglePrecision);
        if (d < bestDist) {
            bestDist = d;
            bestTemplate = T;
        }
    }

    // 3. Score
    // HalfDiagonal is max possible distance? roughly.
    const score = 1.0 - (bestDist / HalfDiagonal);

    if (score > 0.8 && bestTemplate) {
        // Return corrected points based on AABB for now (safest)
        // Trying to perfectly recover rotation from $1 is tricky without storing the `bestAngle` found in the loop.
        // Given constraints, AABB preservation is a good baseline.
        // The user complained about RECOGNITION (not detecting), not CORRECTION (wrong rotation).
        // So fixing detection is the priority.

        const corrected = generateCorrectedShape(bestTemplate.name, points, 0);
        return {
            type: bestTemplate.name as any,
            score,
            correctedPoints: corrected
        };
    }

    return { type: 'none', score: 0 };
};
