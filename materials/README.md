# materials/

One folder per project. Everything here is picked up automatically by the site.
`npm run dev` and `npm run build` sync this folder into `public/materials/`
(you can also run `npm run sync` by hand).

```
materials/
  resume.pdf                 -> Resume page download
  headshot/                  -> one photo of you, shown beside "About the surveyor"
  01-upright/
    notes.txt                -> case-study text (format below)
    cover.jpg                -> hero photo / thumbnail on the Projects trail
    hand-calcs-loads.jpg     -> shown in the "Hand calcs" camp
    fea-von-mises.png        -> shown in the "FEA" camp
    iterations-v2.png        -> shown in the "Iterations" camp
    results-on-car.jpg       -> shown at the summit
    upright.stl              -> converted to an optimized .glb for the 3D viewer
    poster.pdf               -> linked as a document
    anything-else.jpg        -> "Field photos" gallery
```

## File naming

The start of a filename decides where it appears:

| Prefix | Camp |
| --- | --- |
| `cover`, `hero` | Top of the page and the Projects trail |
| `problem`, `context` | Base camp |
| `requirements`, `specs` | Camp I |
| `calcs`, `hand-calcs`, `methods`, `approach`, `architecture`, `geometry` | Camp II |
| `fea`, `analysis`, `sim`, `testing`, `prototype`, `build`, `experiments`, `bench` | Camp III |
| `iterations`, `rev`, `v1`, `v2` | High camp |
| `results`, `summit`, `findings`, `final` | Summit |

The rest of the filename becomes the caption: `fea-von-mises-stress.png` → "Von mises stress".

Images: jpg, png, webp, avif, gif, svg. Video: mp4, webm. 3D: stl (auto-converted), glb.
STLs are assumed to be in millimetres. Each part is laid flat (its thinnest axis
points up), so SolidWorks (Y-up) and Fusion/Onshape (Z-up) exports both work.

### Placing photos without renaming them

Instead of prefixes, you can list files inside any section of notes.txt.
Placed files keep the order you list them in, and the caption after `|` is used:

```
cover: assembled_enclosure.JPG

[fea]
image: instron_testing.JPG | Calibrating a rod on the Instron
```

`cover:` takes a caption the same way (`cover: demo.MOV | The prototype in use`),
and a section containing only `skip` is left off the page.

iPhone `.heic` photos and `.mov`/`.mp4` videos are converted for the web
(JPEG; H.264 MP4 with a poster frame). The converted files are cached in a
`_web/` folder inside the project folder: commit it, so the build on Vercel
can use them without re-converting.

Large photos are resized (2000 px long edge, EXIF rotation applied) when they
are synced, so you can drop phone photos straight in.

## notes.txt format

```
title: Suspension upright
org: Berkeley Formula Racing
role: Suspension lead
year: 2025
location: Berkeley, CA
coords: 37.8719° N, 122.2585° W
tools: SolidWorks, ANSYS, MATLAB
summary: One or two sentences shown on the Projects trail.

[problem]
Plain paragraphs. Blank line between paragraphs.

[requirements]
- A bullet point
- Mass: under 450 g          <- "Label: value" bullets become a spec table

[hand-calcs]
label: Load cases            <- optional: rename this camp's heading
...

[fea]
[iterations]
[results]
- Final mass: 412 g
- Min. factor of safety: 1.8
```

Lines starting with `#` are ignored. Any section you leave out keeps the
placeholder text until you write it.
