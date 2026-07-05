---
title: "Comparing Imputation and Clustering Pipelines on Incomplete Suicide Data from Bangladesh"
date: 2026-06-15
type: paper
featured: true
abstract: >-
  An exploratory study on 1,617 newspaper-reported suicide cases from Bangladesh
  — a country with no central suicide registry. We test 32 combinations of
  imputation, clustering, and evaluation to ask which pipeline recovers real
  structure from severely incomplete data, and which only recovers how the data
  was collected.
link: https://github.com/akashmony01/imputation-clustering-comparison
---

## Why this study

Bangladesh has no centralised suicide registry. For a public-health problem this
serious, that absence is the whole problem: the broadest record that exists is
whatever newspapers happen to report. And that record is full of holes — ages
missing, reasons unstated, locations vague, dates approximate. To study patterns
in it at all, you first have to make two decisions: how to **fill the gaps**
(imputation) and how to **group what's left** (clustering).

Those choices are not neutral. Pick them carelessly and a clustering algorithm
will happily "discover" structure that turns out to be an artifact of *how the
data was gathered* rather than anything about the phenomenon itself. So this is
an honest methods question wearing a public-health coat: **when the data is this
incomplete, which pipeline finds something real — and how would you even know?**

## The data

We assembled **1,617** newspaper-derived cases — to our knowledge the largest
publicly compiled record of its kind for Bangladesh. Because raw reports are
thin, we enriched them: missing weather and location fields were filled from
external APIs (and the responses cached, so the work is reproducible without
hitting those services again). Even after enrichment the missingness varies a lot
feature to feature, which is exactly why the imputation choice matters so much.

## What we tested

Instead of picking one pipeline and hoping, we built a **factorial benchmark** —
every combination of three decisions:

- **Imputation (3):** MICE, KNN, MissForest
- **Clustering (4):** K-Means, Agglomerative, DBSCAN, Spectral
- **Predictor strategy (2):** context-aware vs. no-context (whether imputation is
  allowed to use related fields as predictors, or treats them independently)

That's **32 full pipelines**, plus two encoded baselines — each one run
end-to-end and scored the same way.

## How we scored them

A single clustering metric is easy to game — most of them will reward a
degenerate "one giant cluster plus a few outliers" solution as nice and "tight."
So we scored each pipeline with a **six-part composite**: five standard validity
indices (Silhouette, Calinski–Harabasz, Davies–Bouldin, Dunn, Xie–Beni) plus a
**custom balance penalty** we added specifically to punish those near-degenerate
partitions. The composite is what keeps the comparison honest across 32 very
different pipelines.

## What we found — and the catch

The best configuration was **Agglomerative clustering on MissForest-imputed,
no-context data**, scoring **27.30 out of 32**, and it produced a clean
two-cluster split.

Here's the part that matters most, and the reason this is framed as
*exploratory*. That two-cluster boundary lines up almost exactly with a seam in
our own dataset — the 2020 Kaggle batch versus the manually collected 2017–2019
and 2021–2025 cases. In other words, the structure is **partly confounded with
collection source**: whatever the clusters capture is tangled up with reporting
era and completeness, not just the underlying phenomenon. We report it as
exploratory subgroup structure, **not** as discovered epidemiological categories
— and we say so plainly, because the alternative is a confident result that
isn't true. Naming that confound is, honestly, the most useful finding here:
it's a trap that a single-method study would have walked straight into.

## Reproducibility and ethics

The full pipeline, the assembled dataset, and the cached geocoding/weather
lookups are open, so any stage can be re-run independently of the original
sources — **code under the MIT License, data under CC-BY 4.0**. The dataset
carries ethical safeguards throughout: no personally identifying information is
published, and victim names and identifying details are stripped out. This is a
sensitive subject, and the goal is to make the *method* reusable without putting
individuals on display.

## Status

This is ongoing work — defended as an undergraduate thesis, with a formal paper
to follow. The repository is linked above as **Source**; the full writeup will go
up once the work is formally published.
