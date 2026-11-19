/**
 * Base data for every project. Anything written in materials/<dir>/notes.txt
 * overrides the matching field here (see materials/README.md for the format).
 * Copy marked with `draft: true` is placeholder text waiting for real notes.
 */

const MINOR = new Set(["a", "an", "and", "as", "at", "but", "by", "for", "in", "of", "on", "or", "the", "to", "vs", "via", "with"]);

/**
 * Title case: capitalize every word except short connecting words (unless first or
 * last). Leaves the rest of each word alone, so "FEA", "3D" and "ESP32" survive.
 */
export function titleCase(t: string) {
  const words = t.split(/(\s+)/);
  const last = words.length - 1;
  return words
    .map((w, i) => {
      if (/^\s+$/.test(w)) return w;
      const lower = w.toLowerCase();
      if (i !== 0 && i !== last && MINOR.has(lower)) return lower;
      return w.replace(/^(\P{L}*)(\p{Ll})/u, (_, pre: string, c: string) => pre + c.toUpperCase());
    })
    .join("");
}

export type CampKey = "problem" | "requirements" | "calcs" | "analysis" | "iterations" | "results";

export const CAMP_ORDER: CampKey[] = ["problem", "requirements", "calcs", "analysis", "iterations", "results"];

/** The altitude names of each stage of an ascent. */
export const CAMP_NAMES: Record<CampKey, string> = {
  problem: "Base camp",
  requirements: "Camp I",
  calcs: "Camp II",
  analysis: "Camp III",
  iterations: "High camp",
  results: "Summit",
};

export type Camp = {
  key: CampKey;
  /** What this stage is about for this particular project. */
  label: string;
  body: string;
  list?: string[];
};

export type ProjectBase = {
  slug: string;
  dir: string;
  title: string;
  org: string;
  kind: "hardware" | "software" | "research";
  role: string;
  year: string;
  location: string;
  coords: string;
  tools: string[];
  summary: string;
  camps: Camp[];
  draft: boolean;
};

const hardwareLabels: Record<CampKey, string> = {
  problem: "Problem",
  requirements: "Requirements",
  calcs: "Hand calcs",
  analysis: "FEA",
  iterations: "Iterations",
  results: "Results",
};

function camps(labels: Partial<Record<CampKey, string>>, bodies: Record<CampKey, string>, lists: Partial<Record<CampKey, string[]>> = {}): Camp[] {
  return CAMP_ORDER.map((key) => ({
    key,
    label: labels[key] ?? hardwareLabels[key],
    body: bodies[key],
    list: lists[key],
  }));
}

const BERKELEY = "37.8719° N, 122.2585° W";

export const PROJECTS: ProjectBase[] = [
  {
    slug: "suspension-upright",
    dir: "01-upright",
    title: "Suspension upright",
    org: "Berkeley Formula Racing",
    kind: "hardware",
    role: "Dynamics engineer",
    year: "2026",
    location: "Berkeley, CA",
    coords: BERKELEY,
    tools: ["SolidWorks", "Ansys"],
    summary:
      "The upright ties the wheel to the car: it carries the hub bearings, brake caliper and every suspension pickup. I designed and FEA-validated a lighter upright, then wrote its manufacturing plan for CNC machining.",
    draft: true,
    camps: camps({}, {
      problem:
        "The upright sees braking, cornering and bump loads at the same time, and its stiffness sets how well camber holds under load. A heavy upright is unsprung mass the dampers have to fight on every bump.",
      requirements: "Set from vehicle dynamics targets, packaging inside the wheel, and what the team can machine in-house.",
      calcs:
        "Peak loads came from a weight-transfer model of the car at maximum braking and lateral acceleration, then resolved into forces at each pickup point.",
      analysis:
        "Static structural analysis on each load case, with mesh refinement at the bearing bore and pickup tabs where stress concentrates.",
      iterations: "Material removal guided by the stress plots, checked against stiffness and against what the mill can actually reach.",
      results: "Add final mass, factor of safety and stiffness numbers to notes.txt under [results].",
    }, {
      requirements: ["Survive combined braking + cornering load case", "Hold camber change within target under peak load", "Package inside the wheel with brake clearance", "Machinable on team equipment"],
    }),
  },
  {
    slug: "bell-crank",
    dir: "02-bell-crank",
    title: "Bell crank",
    org: "Berkeley Formula Racing",
    kind: "hardware",
    role: "Dynamics engineer",
    year: "2026",
    location: "Berkeley, CA",
    coords: BERKELEY,
    tools: ["SolidWorks", "Ansys"],
    summary:
      "The bell crank turns pushrod travel into damper travel. Its geometry sets the motion ratio, so the part is both a structural problem and a kinematics problem.",
    draft: true,
    camps: camps({ calcs: "Geometry & hand calcs" }, {
      problem:
        "The bell crank needs a motion ratio that suits the chosen spring and damper, while staying stiff enough that the ratio doesn't drift under load.",
      requirements: "Set by the suspension kinematics, damper selection and the space available on the chassis.",
      calcs:
        "Pivot location and arm lengths were set from the target motion ratio, then pushrod force was resolved into pivot and damper reactions.",
      analysis: "Static structural analysis at peak pushrod load, focusing on the pivot bore and arm roots.",
      iterations: "Pocketing and arm profile changes to remove mass without letting deflection change the motion ratio.",
      results: "Add final mass, motion ratio and safety factor to notes.txt under [results].",
    }, {
      requirements: ["Hit the target motion ratio", "Fit within chassis packaging", "Survive peak pushrod load", "Minimize mass"],
    }),
  },
  {
    slug: "strain-gauge-daq",
    dir: "03-strain-gauge-daq",
    title: "Strain gauge data acquisition",
    org: "Berkeley Formula Racing",
    kind: "hardware",
    role: "Dynamics engineer",
    year: "2026",
    location: "Berkeley, CA",
    coords: BERKELEY,
    tools: ["ESP32", "Strain gauges"],
    summary:
      "Measuring real loads in the suspension members on track, so the design load cases stop being estimates and start being data.",
    draft: true,
    camps: camps({ calcs: "Bridge & gain calcs", analysis: "Bench validation" }, {
      problem:
        "Every suspension part on the car is designed to calculated loads. Without measured data there is no way to tell how conservative those numbers are.",
      requirements: "Sample fast enough to catch load spikes, survive vibration and heat, and log without the driver touching anything.",
      calcs: "Bridge configuration, expected strain at design loads, and the amplifier gain needed to use the ADC's full range.",
      analysis: "Calibrated against known loads on the bench before going on the car.",
      iterations: "Wiring, mounting and filtering changes driven by noise and dropouts seen in early runs.",
      results: "Add measured peak loads and comparison to design loads under [results].",
    }, {
      requirements: ["Sample rate high enough for load spikes", "Rugged wiring and mounting", "Hands-off logging", "Calibrated to known loads"],
    }),
  },
  {
    slug: "verity",
    dir: "04-verity",
    title: "Verity",
    org: "Y Combinator AI wearables hackathon",
    kind: "software",
    role: "Hardware + product",
    year: "2026",
    location: "San Francisco, CA",
    coords: "37.7585° N, 122.3890° W",
    tools: ["Wearable camera", "LLM", "Speech-to-text"],
    summary:
      "An AI wearable that writes a technician's service documentation while they work, so the report is done when the job is.",
    draft: true,
    camps: camps({ calcs: "Architecture", analysis: "Prototype" }, {
      problem:
        "Field technicians spend a large share of their time writing up work they already did. Paperwork happens after the job, from memory, and it shows.",
      requirements: "Hands-free, comfortable for a full shift, and producing documentation good enough to submit without rewriting.",
      calcs: "Capture on the wearable, transcription and summarization in the cloud, structured report out.",
      analysis: "Built and demoed inside the hackathon window.",
      iterations: "Add what changed between the first working build and the demo.",
      results: "Add the demo outcome, judging result and what came next.",
    }, {
      requirements: ["Fully hands-free", "All-day wearable", "Submission-ready reports"],
    }),
  },
  {
    slug: "night-shift",
    dir: "05-night-shift",
    title: "Night Shift",
    org: "Hackathon",
    kind: "software",
    role: "Builder",
    year: "2025",
    location: "—",
    coords: "—",
    tools: [],
    summary: "A hackathon build. Full write-up in progress.",
    draft: true,
    camps: camps({ calcs: "Approach", analysis: "Build" }, {
      problem: "Add the problem this project set out to solve.",
      requirements: "Add the constraints you designed against.",
      calcs: "Add the approach and architecture.",
      analysis: "Add how it was built.",
      iterations: "Add what changed along the way.",
      results: "Add the outcome.",
    }),
  },
  {
    slug: "mycelium-packaging",
    dir: "06-kentucky-mycelium",
    title: "Mycelium packaging research",
    org: "Barzee Bioprocessing Laboratory, University of Kentucky",
    kind: "research",
    role: "Biofabrication engineering intern",
    year: "2026",
    location: "Lexington, KY",
    coords: "38.0307° N, 84.5040° W",
    tools: ["Allevi 3 bioprinter", "3D printing", "Image analysis"],
    summary:
      "NSF-funded research into mycelium-grown composites as a compostable replacement for foam packaging.",
    draft: true,
    camps: camps({ requirements: "Research question", calcs: "Methods", analysis: "Testing", iterations: "Analysis", results: "Findings" }, {
      problem:
        "Expanded polystyrene protects products well and then sits in landfills for centuries. Mycelium composites grow into shape on agricultural waste and compost after use.",
      requirements: "Add the specific research question from the poster.",
      calcs: "Add growth conditions, substrates and sample preparation.",
      analysis: "Add the mechanical tests that were run.",
      iterations: "Add how the data was analyzed.",
      results: "Add the findings from the poster.",
    }),
  },
  {
    slug: "transportation-cv",
    dir: "07-iowa-state-cv",
    title: "Computer vision in transportation",
    org: "REACTOR Laboratory, Iowa State University",
    kind: "research",
    role: "Computer vision engineering intern",
    year: "2025",
    location: "Ames, IA",
    coords: "42.0267° N, 93.6465° W",
    tools: ["Python", "ResNet", "KLT tracking", "React.js", "AWS S3"],
    summary: "NSF-funded research applying computer vision to transportation problems.",
    draft: true,
    camps: camps({ requirements: "Research question", calcs: "Methods", analysis: "Experiments", iterations: "Analysis", results: "Findings" }, {
      problem: "Add the transportation problem the research addressed.",
      requirements: "Add the research question.",
      calcs: "Add the dataset and model approach.",
      analysis: "Add the experiments that were run.",
      iterations: "Add how results were evaluated.",
      results: "Add the findings.",
    }),
  },
];

/**
 * The trail, in order. Projects in PROJECTS but not listed here are hidden from
 * the site (their materials folders and notes are kept).
 */
export const ORDER = ["strain-gauge-daq", "bell-crank", "verity", "mycelium-packaging", "suspension-upright", "transportation-cv"];

/** Visible projects, in trail order. */
export const TRAIL: ProjectBase[] = ORDER.map((slug) => {
  const p = PROJECTS.find((x) => x.slug === slug);
  if (!p) throw new Error(`ORDER lists unknown project "${slug}"`);
  return p;
});

/** Deterministic map metadata for each waypoint. */
export function waypointMeta(index: number) {
  const wpt = String(index + 1).padStart(2, "0");
  // The trail descends from the first waypoint toward the last.
  const elevation = 2940 - index * 380 + ((index * 137) % 90);
  return { wpt, elevation };
}

export function formatFt(n: number) {
  return n.toLocaleString("en-US");
}
