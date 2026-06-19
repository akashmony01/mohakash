---
title: "A Context-Aware Graph Neural Network for Banglish Spell Correction"
date: 2025-12-19
type: paper
abstract: >-
  Our ICCIT 2025 paper on normalizing Banglish — Bangla written in English
  letters — by treating a sentence as a graph of tokens instead of a sequence.
  The model reaches 92.64% word-level accuracy, ahead of BiLSTM, Transformer,
  and edit-distance baselines.
link: https://ieeexplore.ieee.org/document/11490275
---

## The problem

Millions of Bangladeshis write Bangla in English letters. It's faster on an
English keyboard and doesn't need a Bangla layout, so social media, comments,
and chat are full of it. The catch is that there's no agreed-upon spelling. The
single word "ভালো" (*good*) shows up as *valo*, *bhalo*, or *bhallo*; "এখনো"
(*still*) as *ekhno*, *ekhnno*, *ekhn*, or just *khno*. Abbreviations drift from
person to person — *bcz* for "কারণ" (*because*) — and the same string can mean
two different things: *bar* is "বার" (*time/occasion*) in one sentence and
"বাড়ি" (*home*) in another.

For a human this is easy. For an NLP system it's a wall: before you can run
sentiment analysis, translation, or a chatbot on Banglish, you have to
**normalize** it back to standard Bangla — and the spelling is too irregular for
the usual tools to handle reliably.

## Why the usual approaches fall short

There are three common ways to attack this, and each hits a ceiling:

- **Rule-based transliteration** is brittle. It can't cope with spellings it has
  never seen, and informal text invents new ones constantly.
- **Edit-distance matching** is cheap but blind to meaning. It happily "corrects"
  a word to the nearest-looking one, even when context says otherwise — lots of
  confident, wrong answers.
- **Sequence models (BiLSTM, Transformer)** read the sentence left to right.
  They improved things, but they still struggle when the cue that disambiguates a
  word sits several tokens away, or when the sentence is short, noisy, and missing
  its usual structure.

The thread running through all three: they treat a sentence as a *line*. Banglish
ambiguity is rarely resolved by the word next door — it's resolved by the whole
sentence at once.

## The idea: read the sentence as a graph

So we stopped reading it as a line. Each token becomes a **node** in a graph, and
edges connect tokens by three different signals at the same time:

- **Contextual similarity** — how related two tokens are in meaning (cosine
  similarity of their embeddings).
- **Co-occurrence** — how often the two tokens actually appear together in the
  training data.
- **Character proximity** — how close they are in spelling (normalized edit
  distance), which catches the phonetic variants.

Those three are blended into a single weighted connection between tokens
(weighted `0.5 / 0.3 / 0.2` respectively, tuned on a validation set). A **graph
neural network** then passes messages along these edges for three rounds, so each
token's representation is shaped by its whole neighborhood — including words it
isn't adjacent to. A sentence-level summary is folded back into every token
before the final prediction, which is what lets the model resolve the *bar* =
time vs. *bar* = home case from context rather than spelling alone.

## The data

We built a hand-annotated dataset for this: ~80,000 raw Banglish–Bangla pairs
scraped from informal sources, filtered down to **63,132** clean, human-checked
examples (annotators resolved the ambiguous and abbreviated tokens by hand using
sentence context). Split 70/15/15 for training, validation, and test, and
tokenized at **both** the word level (a 12,000-word vocabulary) and the character
level (75 characters) — so the model sees meaning *and* spelling.

## What we found

On held-out test data the graph model reached **92.64% word-level accuracy**,
ahead of every baseline:

| Model | Word accuracy | Sentence accuracy | F1 |
|---|---|---|---|
| Edit-distance | 78.42% | 18.36% | 0.751 |
| BiLSTM | 86.53% | 27.42% | 0.859 |
| Transformer | 89.15% | 32.87% | 0.887 |
| **Context-aware GNN (ours)** | **92.64%** | **40.25%** | **0.917** |

The gains were largest exactly where they should be: disambiguating polyphonic
and abbreviated tokens — the cases that need context, not just spelling.

The honest caveat is that sentence-level number, **40.25%**. It looks low, but
the metric is strict — a single wrong token fails the entire sentence — and the
GNN still beat every baseline on it. Long sentences with long-range dependencies
are where it struggles most, and the training is compute-heavy. Useful, not
solved.

## Why it matters

Banglish normalization is the unglamorous first step that makes everything
downstream possible — sentiment analysis, machine translation, speech, and
conversational AI that actually works for the way Bangladeshis really write
online. Getting it right is partly a question of inclusion: a lot of NLP quietly
assumes clean, standardized input, and a lot of real users don't write that way.

## Details

Published at the **28th International Conference on Computer and Information
Technology (ICCIT 2025)** in Cox's Bazar, Bangladesh, with Abdullah Al Shafi,
Syed Alve Ahad, Ashifur Rahman, Samin Yasar, and Md. Saddam Hossain. The full
method — the adjacency construction, the message-passing equations, the
hyperparameter search, and the ablation studies — is on IEEE Xplore, linked above
as **Source**.
