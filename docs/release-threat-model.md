# Release threat model: two npm packages, one maintainer

This is an analysis of the release path for two packages:

- `@y4shin/pi-task-workflow`, from `github.com/Y4shin/skills`
- `@y4shin/pi-telemetry`, from `github.com/Y4shin/pi-telemetry`

It exists to answer one question and to be honest about the answer: how much
does signature checking actually buy when the check, the code, and the signing
key all live inside the blast radius of the same compromised account.

Nothing was changed to produce this. No code, workflow, script, or
configuration was edited, and nothing was committed or pushed. The state below
was read from the repositories, from read-only `gh api` calls, from the public
npm registry, and from experiments in a scratch directory under `/tmp`.

Citation markers point at the Sources section. Claims marked `(reasoning)` are
inference, not documentation. Claims marked `[observed]` were read off the
repos or the registry. Claims marked `[local test]` were reproduced in a
throwaway git repository.

---

## 1. Assets and trust boundaries

### Assets, in the order an attacker would rank them

1. **The live tarball on npm.** A published version is installed by users and
   loaded as a Pi extension, so it is arbitrary code execution inside the
   consumer's agent process. This is the only asset whose compromise reaches
   people other than the maintainer.
2. **The `latest` dist-tag.** `pi install npm:@y4shin/pi-task-workflow` resolves
   through it. Whoever moves it decides what new installs get.
3. **The npm account.** It can approve staged versions, publish directly if
   the package allows token publishing, and rewrite the trusted publisher
   configuration.
4. **The repository's `main` history and its tags.** These are the evidence
   trail that a release is what it claims to be. If they can be rewritten, the
   evidence is worthless even when the release was clean.
5. **The release workflow file.** It decides which steps run before a version
   is staged, and it runs with `id-token: write`.
6. **The signing key.** A GPG key on a hardware token, fingerprint
   `7D5809CC28C73E4F67AA31398DC23ECC63F6BBA7` `[observed]`.
7. **Consumer trust in the package name.** Reputation, which survives a bad
   release by roughly the time it takes word to spread.

### Trust boundaries

| # | Boundary | What crosses it today |
|---|----------|----------------------|
| B1 | Laptop to GitHub | the `gh` OAuth token, scope `repo`, `workflow` `[observed]` |
| B2 | GitHub tag to Actions runner | the workflow definition taken from the pushed ref [14] |
| B3 | Runner to npm registry | an OIDC token exchanged for a short-lived, stage-only credential [7][17] |
| B4 | Staged version to live version | the maintainer's 2FA approval [18][19] |
| B5 | Laptop to signing key | a PIN and a touch on a smartcard `[observed]` |
| B6 | Third-party code to runner | dependency install scripts and two unpinned Actions [20][21] |

### The asymmetry this whole document turns on

B4 is the only boundary that a compromised GitHub account cannot cross. B1, B2,
B5 and B6 are all inside the GitHub plane, and inside that plane the attacker
who holds push access is the same author as the maintainer: they can push a tag
whose commit carries a rewritten `release.yml`, because a `push` event runs the
workflow as it exists on the pushed ref, "including workflows that are not
merged into the default branch" [14].

So the shape of the risk is:

- Malicious code reaches the registry only through the approval step, or
  through the npm account itself.
- Everything upstream of the approval is an integrity-of-evidence problem, not
  a release-gate problem.
- Controls that live inside the repository or the workflow buy evidence, not
  prevention. That is exactly where signature verification lands.

---

## 2. State as found

Everything in this table is `[observed]` unless marked otherwise.

| Thing | State today | How it was read |
|-------|-------------|-----------------|
| Branch protection on `main`, both repos | none (`404 Branch not protected`) | `gh api repos/Y4shin/*/branches/main/protection` |
| Rulesets, both repos | none (`[]`) | `gh api repos/Y4shin/*/rulesets` |
| Environments, both repos | none (`total_count: 0`) | `gh api repos/Y4shin/*/environments` |
| Collaborators, both repos | one, `Y4shin`, admin | `gh api repos/Y4shin/*/collaborators` |
| Actions policy | `allowed_actions: all`, `sha_pinning_required: false`, `default_workflow_permissions: read` | `gh api repos/Y4shin/*/actions/permissions` |
| Repo or environment secrets | `0` | `gh api repos/Y4shin/*/actions/secrets` |
| Actions used by the release | `actions/checkout@v4`, `actions/setup-node@v4`, both mutable tags | `.github/workflows/release.yml` |
| Job permissions | workflow-level `permissions: contents: read, id-token: write`, inherited by the single job, no `environment:` | same |
| Step order | `npm ci`, typecheck, tests, tag-versus-version, `npm pack --dry-run`, `npm stage publish` | same |
| Tags, `skills` | 53 tags, all annotated; 51 carry a GPG signature by the smartcard key; `v1.0.0` and `v5.0.2` do not | `git cat-file -p` over every tag |
| Tags, `pi-telemetry` | 6 tags, all annotated; `v0.4.2` is the only unsigned one | same |
| Commits | mostly unsigned; 3 recent commits in `pi-telemetry` are signed | `git cat-file -p` over the last 10 to 20 |
| Tag signature validity | `git verify-tag v4.0.0` gives `Good signature`, fingerprint `...8DC23ECC63F6BBA7` `[local test]` | in this checkout |
| Same tag on a runner-like keyring | `Can't check signature: No public key`, exit 1 `[local test]` | empty `GNUPGHOME` |
| Signing unattended | `git tag -a` with the smartcard key and no TTY blocks on pinentry until killed `[local test]` | scratch repo, 25 s timeout |
| Trusted publisher, both packages | registered, stage only, `npm publish` and `dist-tag` not granted | `release.yml` header, and [17] for the option set |
| Provenance | present for `pi-task-workflow@5.0.2` and `pi-telemetry@0.4.2`; absent (`404`) for `5.0.1`, `0.4.1`, `0.0.0-stage` | `registry.npmjs.org/-/npm/v1/attestations/...` |
| Loose ends on the registry | a `0.0.0-stage` placeholder exists for both packages, which npm creates the first time a package is staged [18] | packument `versions` |
| npm account | 2FA is enabled and required for account operations (`npm trust list` answers `EOTP`); maintainers of both packages: `y4shin` only | npm CLI |

The provenance record for `5.0.2` names the workflow, the ref, and the commit:

```
workflow.ref        refs/tags/v5.0.2
workflow.path       .github/workflows/release.yml
resolvedDependency  gitCommit 05d44a0ced212c048fe273085dc42a4da4755771
builder             github.com/actions/runner/github-hosted
```

Two facts worth pulling out of that table:

- **Tag signing already worked, and the automation does not do it.** The 51
  signed tags are the historical, manually cut releases. The newest tag in each
  repo (`v5.0.2`, `v0.4.2`), whose commit message matches `./scripts/release.sh`,
  is unsigned, and so is the old `v1.0.0`. The key is not the obstacle:
  unattended signing has to get a PIN into a smartcard, and it blocks until it
  does `[local test]`. What the release run actually did instead of blocking I
  did not establish, since `git tag -a` with the global `tag.gpgSign=true` and
  no TTY hangs and creates nothing `(reasoning, from one reproduction)`.
- **`npm ci` runs before every check in the workflow**, and the job holds
  `id-token: write`, and any step in a job can request an OIDC token [7].
  Nothing in the current workflow keeps a dependency's `postinstall` script
  away from the credential that can stage a release.

---

## 3. Adversaries, and what each can do today

### A1. Attacker with the maintainer's GitHub credentials

**Can do today.** Push to `main`. Create, move, or delete any tag, because no
ruleset protects `v*`. Edit `release.yml`, and push a tag pointing at a commit
where `release.yml` no longer contains the checks. Change repository settings,
because the account is admin. Stage any version the trusted publisher allows,
which is any version, because `npm stage publish` needs no 2FA [19]. Squat on a
future version number, since staged and published versions share one semver
index [19], which denies the maintainer their next release until they reject it
with 2FA.

**Cannot do today.** Publish or approve. They hold no npm credential, the
trusted publisher is stage-only [17], and approval demands 2FA [18][19].

**What the staged plus 2FA gate stops.** Everything that would make the release
live. The attacker's ceiling is a staged tarball sitting in a review queue.

**What signature verification adds.** In the workflow as it stands, nothing
preventive: the same attacker can push a tag whose commit contains a modified
workflow, and that modified workflow is the one GitHub runs [14]. It adds one
useful thing and one dangerous thing. Useful: a plain tag pushed onto an
unsigned commit fails unless the attacker also lands a visible workflow edit,
so quiet tampering becomes loud tampering. Dangerous: it invites the
maintainer to treat a green run as evidence of authorship, when the run's
definition was inside the attacker's write scope.

**What actually reduces this risk.** The npm approval, done as a review of
evidence rather than a click. Nothing on the GitHub side can help, because the
attacker *is* the admin. See the ranked list.

### A2. Attacker with a collaborator's GitHub credentials, write access

**Can do today.** The same as A1 minus account-level operations: push to
`main`, push tags, edit workflows, stage. They cannot silently alter ruleset
bypass lists or add collaborators. There are no collaborators on either repo
today `[observed]`, so this is a forecast, not current exposure.

**What the gate stops.** Same ceiling as A1: staging, not publishing.

**What signature verification adds.** Here it *can* become preventive, because
there is a boundary a write-level collaborator cannot cross: a second repository
they have no access to, or, if push rulesets are available, a rule that
restricts `.github/workflows/**` and `v*` creation to admins [9]. Without one of
those, the check is inside their write scope like everything else.

### A3. Attacker who compromises the npm account

**Can do today.** Approve a staged version, which means the gate itself. Publish
directly, unless token publishing is disallowed. Replace the trusted publisher
configuration. Move dist-tags. Deprecate or unpublish within policy.

**What the gate stops.** Nothing. This adversary is on the far side of B4.

**What signature verification adds.** Nothing. The signature is on the git
object; this attacker never touches git.

**What helps.** A second factor that cannot be phished or replayed: a security
key over WebAuthn, which npm supports for both web and command line [24]. Then
"Require two-factor authentication and disallow tokens" on the package, which
npm recommends explicitly as the strongest posture for a trusted-publishing
package [17]. Detection is provenance: a version with no attestation was not
built by CI, which is how `5.0.1` and `0.4.1` would be spotted `[observed]`.

### A4. Attacker who compromises a dependency or an Action

**Can do today.** `npm ci` runs dependency lifecycle scripts [21], and npm's
policy surface for this (`allow-scripts`, `allowScripts`, `strict-allow-scripts`)
exists precisely because they run by default [20]. Those scripts run in a job
that holds `id-token: write`, before the tag check, and before `npm stage
publish`. A compromised devDependency can therefore:

1. request the OIDC token and stage anything it likes (stage-only, so it still
   cannot make it live) [7][17];
2. mutate the worktree after checkout, so the tarball that carries provenance
   for commit X does not contain commit X's sources;
3. read the persisted `GITHUB_TOKEN` out of `.git/config`, whose value is
   `contents: read` only [4], which is the smallest of the three problems.

On top of that, both Actions are pinned to mutable tags (`@v4`), which GitHub's
own guidance says to replace with a full-length commit SHA [12], and the repo
setting that would enforce it is off `[observed]` [13].

**What the gate stops.** The same ceiling: staging, not publishing.

**What signature verification adds.** Nothing, and the ordering makes it worse
than nothing if the check is placed after `npm ci`: the tree has already been
executed and possibly rewritten, so a valid signature on the tag says nothing
about the tarball.

### A5. Attacker who compromises the maintainer's local machine

**Can do today.** Read the `gh` OAuth token with `repo` and `workflow` scope
`[observed]`, which is A1 with none of the effort. Read the npm session token
(`npm whoami` answers without an OTP `[observed]`), which means they can stage.
Sign, while the card is inserted and gpg-agent holds an unlocked copy of the
PIN. That unattended signing blocks without a TTY is `[local test]`; how long a
warm cache keeps accepting signatures is `(reasoning, from gpg-agent's caching,
not measured here)`. Possibly approve, if the second factor is a TOTP secret
stored on that same machine; I could not determine whether it is TOTP or a
security key.

**What the gate stops.** The approval step, if and only if the second factor is
not on the compromised machine. That is the narrow, load-bearing assumption of
this design.

**What signature verification adds.** Nothing, and it is the case where
believing otherwise is most expensive. Signature verification answers "was this
signed by key K". The key is a smartcard, which is good: the private key cannot
be exfiltrated without physical possession of the card `[observed]`. But the
machine that holds the code also drives the card, so the answer degrades to
"this was signed on the machine that was building the code". Against malware
that waits for the maintainer to be present, that is not a meaningful
distinction. Against malware that has to work unattended, the hardware token
does help, and `gpg-agent`'s PIN cache window is the measure of how much.

### A6. A malicious or coerced maintainer

**Can do today.** Everything. They hold the key and the second factor, and no
control in this document is designed to stop them.

**What the gate stops.** Nothing. Staged publishing is, in npm's own words,
"proof-of-presence" [19]. It proves a person was there, not that the person was
free to refuse.

**What signature verification adds.** Not prevention, evidence. And it cuts
both ways: it converts "an unsigned artifact that CI happened to build" into
"an artifact cryptographically attributable to my key", which is what an outside
investigator would want, and also what someone applying pressure would want.
This is the one place where the honest answer is that the control is about
after-the-fact accountability and nothing else.

**What would actually help.** Dual control at approval. npm does not offer it:
the documented flow is one maintainer approving, and any maintainer with 2FA can
be that one [18]. The closest substitute is a second independent reviewer with read access to the
staged tarball who is expected to approve the release socially, plus the public
transparency log entry that provenance creates [22]. Neither is enforcement.

---

## 4. Controls, with verdicts

Each entry says what it stops, what it costs, and whether it is worth doing
here. "Theatre" means it changes paperwork, not reachability.

### 4.1 Approval as evidence review, not as a click

- **Stops:** A1, A2, A5, and it is the only thing that does.
- **Mechanism:** `npm stage download <stage-id>`, hash the tarball, compare it
  to a tarball packed from a clean checkout of the signed tag on a different
  machine, and approve from a device that is not the development laptop.
- **Cost:** minutes per release, no code.
- **Verdict:** worth doing, first. Everything else is decoration around this.

### 4.2 npm package setting: require 2FA and disallow tokens

- **Stops:** token theft on the npm side, and any lingering long-lived
  publishing credential.
- **Cost:** a few clicks per package; npm states trusted publishers keep
  working because they use OIDC [17].
- **Verdict:** worth doing.

### 4.3 Security key (WebAuthn) for npm 2FA

- **Stops:** A3 by phishing or TOTP relay; removes the copyable secret from the
  laptop, which is the A5 approval path.
- **Cost:** one or two keys, and a browser flow at approval time. npm supports
  security keys from both web and CLI [24], and the CLI already drives a
  browser URL for the challenge `[observed]`.
- **One more reason it matters:** `npm stage approve` accepts `--otp` [19], so an
  approval can be scripted wherever a TOTP secret is available to the script. A
  WebAuthn key cannot be turned into a string that a script can hold, which is
  what makes "the approval cannot be automated" true rather than merely
  conventional.
- **Verdict:** worth doing, if 2FA is currently TOTP (unverified).

### 4.4 Split the workflow: unprivileged build, privileged stage

- **Stops:** A4. Install, typecheck and test in a job with no `id-token`, upload
  the packed tarball, and have a second job whose only actions are download the
  artifact and `npm stage publish`.
- **Cost:** about 30 lines of YAML and one debugging cycle.
- **Verdict:** worth doing. It is the cheapest structural change that removes a
  credential from the reach of dependency scripts.
- **Also:** `persist-credentials: false` on checkout [4], and a
  `git status --porcelain` assertion before packing, so a mutated worktree
  fails loudly.

### 4.5 Pin the Actions, and enforce it

- **Stops:** A4's Action half: a retargeted `v4` tag.
- **Mechanism:** full-length commit SHAs in the workflow [12], the repository
  setting "Require actions to be pinned to a full-length commit SHA" [13], and an
  allowlist restricted to `actions/*` and `github/*` [13].
- **Cost:** minutes, plus Dependabot upkeep. GitHub's dependency lockfile
  feature would supersede SHA pinning [12][16], but it is listed as available to
  GitHub Enterprise Cloud [16], so it is not an option here.
- **Verdict:** worth doing.

### 4.6 Tag ruleset on `v*`, and a ruleset on `main`

- **Stops:** A2 (a write-level collaborator), and it makes A1's tampering
  visible rather than silent. "Restrict creations" means only users with bypass
  permissions can create a matching tag; "Restrict updates" and "Restrict
  deletions" belong with it [9]. On `main`, a required pull request plus no
  force pushes.
- **Cost:** minutes in the UI, and the maintainer must add themselves to the
  bypass list or route their own work through a PR.
- **Verdict:** worth doing, especially before a second person ever gets write
  access. It does nothing against A1, since the account is admin.

### 4.7 Push ruleset restricting `.github/workflows/**`

- **Would stop:** A2 editing the release workflow, and A1 if the admin is not in
  the bypass list, which it always is.
- **Caveat:** the docs describe push rulesets as available "for the GitHub Team
  plan in internal and private repositories" and are silent about public
  repositories on a personal plan [9]. Whether it is available on these two
  repos is unverified.
- **Verdict:** check whether it is offered, use it if it is, do not design
  around it.

### 4.8 Environment with required reviewers on the publish job

- **Stops:** nothing that the npm approval does not already stop harder. The
  staging job has no authority to publish, so gating it with a human click adds
  no constraint on the outcome.
- **Worse:** the protection is keyed on the environment name, and a workflow
  that references an environment which does not exist gets one created with no
  protection rules [10]. An attacker who can edit the workflow renames the
  environment and walks past the reviewer. Only repository admins can configure
  an environment, but anyone who can edit workflows can create one by naming it
  [10].
- **Cost:** one approval click plus one more failure mode per release.
- **Verdict:** theatre here. It would make sense if the job could publish, which
  is precisely what the trusted publisher configuration forbids.

### 4.9 "Require signed commits" on `main`

- **Stops:** unsigned commits reaching `main`. It does not stop A1 or A2,
  because GitHub's notion of verified is, in effect, "signed by a key registered
  on some GitHub account" [15], and both adversaries have an account of their
  own and can register a key. It also does not pin one specific key, which is
  what the maintainer actually asked for.
- **Cost:** every commit must be signed, on a smartcard, with a touch, including
  the ones no human watches. The current automation cannot sign unattended
  `[local test]`.
- **Verdict:** theatre for this threat model. Use key pinning in the release
  check instead.

### 4.10 Signed release tags, as a habit

- **Stops:** nothing on its own. With a control repository or an unbypassable
  ruleset in front of the check, it is the thing that gets checked.
- **Cost:** one PIN and one touch per release, once the automation runs with a
  TTY again.
- **Verdict:** worth restoring, but see section 5 for what it is and is not.

### 4.11 Provenance

- **Stops:** nothing. It is detection.
- **Value:** it is the only cheap way to tell a CI-built version from a
  hand-published one, and a consumer or an auditor can check it without asking
  the maintainer [22]. Both current releases carry it, and `5.0.1` and `0.4.1`
  do not `[observed]`.
- **Caveat:** provenance binds the tarball digest to a workflow run, the ref,
  and the commit. It does not assert that the tarball's contents equal that
  commit's sources, because the build is not hermetic and a step before packing
  can rewrite the tree `(reasoning)`. Do not use it as a substitute for reading
  the diff.

---

## 5. The signature question

### 5.1 Short answer

Yes. The pipeline can be made to fail on a tag or commit that is not signed by
a pinned key, and the mechanism is about twenty lines of workflow: check out
with full history, import a committed public key into an empty keyring (or point
`gpg.ssh.allowedSignersFile` at a committed signers file), and run
`git verify-tag` and `git verify-commit` on the tag and the commit it points at.
Both nonzero exits fail the step, and a failed step means `npm stage publish`
never runs.

It works for GPG and for SSH signing, and pinning "one of a set" is just
importing several keys, or listing several keys, and then asserting the exact
fingerprint or key string so the set cannot grow silently.

It does not create a boundary against an attacker who can push, because the
workflow runs from the pushed ref [14]. Section 5.7 deals with that honestly.

### 5.2 What exactly is being verified

Two different objects, and the difference matters:

- **The tag object.** `git verify-tag` "validates the gpg signature created by
  git tag in the tag objects listed on the command line" [1]. It only has
  something to check if the tag is annotated: a lightweight tag has no tag
  object and cannot be verified. `[local test]` An annotated but unsigned tag
  fails with `error: no signature found` and exit 1. `[local test]`
- **The commit the tag points at.** `git verify-commit` validates the signature
  on commit objects [2]. It must be given the commit, not the tag:
  `git verify-commit v5.0.2` fails with `cannot verify a non-commit object of
  type tag`, while `git verify-commit 'v5.0.2^{commit}'` checks the real thing.
  `[local test]`

Verifying only the tag signature is not the same as verifying the commit. The
tag object contains the hash of the commit it points at, and the signature
covers the tag object, so a valid tag signature does bind that one commit hash.
It says nothing about whether that commit was signed. If the intent is "releases
are signed by this key", check both, and additionally assert that `HEAD` is the
tag's commit, since `HEAD` is what `npm pack` will pack:

```
[ "$(git rev-parse HEAD)" = "$(git rev-parse "v${version}^{commit}")" ]
```

### 5.3 What to check out: `fetch-depth`

`actions/checkout@v4` fetches one commit by default and documents
`fetch-depth: 0` for "all history for all branches and tags" [4]. Its source
shows what that means for a tag push: with the default depth it fetches
`+refs/tags/<tag>:refs/tags/<tag>` with `--no-tags --depth=1`, and with
`fetch-depth: 0` it fetches `+refs/heads/*:refs/remotes/origin/*` plus
`+refs/tags/*:refs/tags/*` [5][6].

Reproducing the default fetch against a repository with an annotated tag: the
tag object is present (`git cat-file -t` answers `tag`), `git verify-tag`
inspects the tag object, and `git verify-commit` verifies a signed commit, all
at depth 1. `[local test]` What depth 1 cannot do is prove the tagged commit is
on `main`: there is no `origin/main` object and `git merge-base --is-ancestor`
fails. `[local test]`

So: `fetch-depth: 0`, because the check that is worth having is not just "signed"
but "signed and reachable from `main`":

```
git merge-base --is-ancestor "$(git rev-parse "v${version}^{commit}")" \
  refs/remotes/origin/main
```

Also set `persist-credentials: false`; by default checkout writes the
`GITHUB_TOKEN` into the local git config [4], and there is no reason for a
release job to leave it there.

### 5.4 Pinning the trusted keys, GPG

Commit the armored public key, for example `release/release-signing-key.asc`,
exported by fingerprint:

```
gpg --armor --export 7D5809CC28C73E4F67AA31398DC23ECC63F6BBA7 > release/release-signing-key.asc
```

Then in CI, verify against a keyring that contains nothing else:

```
export GNUPGHOME="$(mktemp -d)"
gpg --batch --import release/release-signing-key.asc
```

Two details that are easy to get wrong:

- **Trust level does not need to be set.** With a key that is present but not
  trusted, `git verify-tag` prints `Good signature ... [unknown]` and exits 0,
  because non-merge verification only requires "at least undefined trust" [3].
  `[local test]` The pinning is the keyring contents, not the ownertrust.
- **A key that is not in the keyring fails hard.** A tag signed by a different
  key in the same keyring-less state gives `Can't check signature: No public
  key` and exit 1, even when the rogue key carries the identical user ID.
  `[local test]` This is the property that makes a fresh `GNUPGHOME` worth
  creating: it turns "any key in the world" into "the keys I imported".

For "one of a set", import several keys. For "exactly these keys and no others",
assert the fingerprints, because the `.asc` file is in the repository and is
therefore editable by the same people who edit everything else:

```
expected="7D5809CC28C73E4F67AA31398DC23ECC63F6BBA7"
actual="$(gpg --show-keys --with-colons release/release-signing-key.asc \
  | awk -F: '/^fpr/{print $10}' | sort | tr '\n' ' ')"
[ "$actual" = "$expected " ]
```

### 5.5 Pinning the trusted keys, SSH

SSH signing needs `gpg.format` set to `ssh`, and it needs an allowed signers
file, which git refuses to guess: without one, verification fails with
`gpg.ssh.allowedSignersFile needs to be configured and exist for ssh signature
verification` [3]. `[local test]`

```
git config --global gpg.format ssh
git config --global gpg.ssh.allowedSignersFile "$PWD/release/allowed_signers"
```

`release/allowed_signers` holds one line per trusted key, principal first:

```
patric@patricplattner.de ssh-ed25519 AAAAC3Nza...
```

The principal is a label, not a constraint. It is used "only to identify the
key" [3], and a signature made with a key listed under a different principal
still verifies: in a scratch repo, a file naming `other@example.com` with the
right key produced `Good signature for other@example.com`, exit 0, while a file
naming the right principal with a different key produced `No principal matched`,
exit 1. `[local test]` So pin the key material, and if the exact set matters,
assert the key strings the same way as the fingerprint above. For revocation,
`gpg.ssh.revocationFile` is the documented hook [3].

The runner has what this needs: `ubuntu-latest` is Ubuntu 24.04, which ships
`gnupg2` 2.4.4 and `openssh-client` 9.6p1 [23].

### 5.6 The check, in place

Ordered before anything that executes third-party code:

```yaml
- uses: actions/checkout@<40-hex sha>
  with:
    fetch-depth: 0
    persist-credentials: false

- name: Verify the release signature
  run: |
    set -euo pipefail
    tag="$GITHUB_REF_NAME"
    export GNUPGHOME="$(mktemp -d)"
    gpg --batch --import release/release-signing-key.asc
    # pin the fingerprint, not just "some key is imported"
    actual="$(gpg --show-keys --with-colons release/release-signing-key.asc \
      | awk -F: '/^fpr/{print $10}' | sort | tr '\n' ' ')"
    [ "$actual" = "7D5809CC28C73E4F67AA31398DC23ECC63F6BBA7 " ]
    # annotated tag, or there is nothing to verify
    [ "$(git cat-file -t "$tag")" = "tag" ]
    git verify-tag "$tag"
    git verify-commit "${tag}^{commit}"
    # the commit we verified is the tree npm will pack
    [ "$(git rev-parse HEAD)" = "$(git rev-parse "${tag}^{commit}")" ]
    # and it is on main
    git merge-base --is-ancestor "$(git rev-parse "${tag}^{commit}")" \
      refs/remotes/origin/main
```

For SSH, replace the import and fingerprint lines with a key-string assertion
against `release/allowed_signers` and the two `gpg.format` /
`gpg.ssh.allowedSignersFile` config lines. `--raw` gives machine-readable status
on stderr if a step wants to distinguish "unsigned" from "signed by the wrong
key" [1][2], but the exit code is the contract.

Cost to adopt: one key file, about twenty lines, and the discipline to sign tags
again. Note that the check would fail on the current `v5.0.2` and `v0.4.2`,
because both are unsigned `[observed]`.

### 5.7 The limitation, stated plainly

The workflow file lives in the repository it releases. A push event runs the
workflow as it exists on the pushed ref, "including workflows that are not
merged into the default branch" [14]. An attacker with push access does not need
to touch `main` to defeat this: they push a tag on a commit whose
`release.yml` omits the verification step, or whose key file contains their own
key, and GitHub runs that file. The check is then not a gate but a decoration
that happens to be present in the honest path.

That is not a reason to skip it. It is a reason to be precise about what it
buys:

- It converts "we shipped from an unsigned commit" from invisible to a failing
  job, which is a real defense against accident and against a *quiet* tag push.
- It gives an auditable record: the run log shows which fingerprint verified
  which commit hash, which is the thing an investigator wants after the fact.
- It closes the case the maintainer is most likely to hit in practice, which is
  a mistake, not an attacker.

**What actually closes the hole, and what it costs:**

1. **Move the trust anchor out of the writable repo.** A small second
   repository, writable only by the maintainer, holds the release workflow, the
   pinned key, and the fingerprint. It triggers on `workflow_run` or
   `repository_dispatch` from the package repo, checks out the claimed tag with
   full history, verifies it, and stages. The npm trusted publisher then has to
   point at that repository and workflow file name; the connection cannot be
   edited, only deleted and recreated, and a fresh connection expires after two
   days if it does not complete a first publish [17]. Cost: a second repo, a
   workflow rewrite, a trusted publisher migration, and the discipline to never
   give a collaborator write access to the control repo. What it buys: A2 is
   fully stopped, A1 is not (an admin of both repos can edit both).
2. **Restrict who can create `v*` tags and who can touch
   `.github/workflows/**`.** Tag rulesets with "Restrict creations" limited to
   admins [9] stop every write-level collaborator from starting a release at
   all. The path-restriction half is a push ruleset, whose availability on these
   repos is unverified [9]. Cost: minutes, plus the maintainer loses the ability
   to push to `main` without bypassing their own rule.
3. **Accept the residual and put the weight on B4.** This is what the current
   design already does, and it is defensible as long as the 2FA approval is a
   review of a downloaded tarball and not a reflex click. Cost: minutes per
   release, every release. What it buys: A1, A2, A3 and A5 all still have to get
   past a human who is looking at a hash.

There is no configuration of rulesets, environments, or CI checks that stops A1
without moving the approval decision, because A1 holds every credential that
configures those controls. Any claim otherwise is the theatre described in
section 4.8.

---

## 6. Residual risk

### Not acceptable as the process stands

1. **A single 2FA click is the whole distance between a compromised GitHub
   account and every consumer.** Today the staged version is approved from the
   same habit that produced it, without comparing the tarball to a build of the
   signed tag. Until that comparison happens, A1 and A2 have a realistic path.
2. **A dependency's install script runs with `id-token: write` in the same job
   that stages, before any check.** A compromised devDependency can produce a
   staged tarball that differs from the commit its provenance names. Anyone who
   reads provenance as "this equals the source tree" is being misled.
3. **A local machine compromise carries the `gh` token with `repo` and
   `workflow` scope plus a warm signing key.** The 2FA approval is the only
   thing left, and it is only out of reach if the second factor is not on that
   machine. Unverified, and therefore unacceptable until verified.
4. **One person holds both the GitHub admin seat and the npm approval.**
   Coercion and insider action have no counterweight, because npm offers no
   dual approval [18].

### Acceptable, with eyes open

1. **Unsigned release tags today.** Given section 5.7, signing is evidence, not
   a boundary. The unsigned tags are a bookkeeping gap.
2. **A1 or A2 can delete or rewrite tags and rewrite `main` history.** Damage is
   to the evidence trail and to reputation, not to the live registry, as long as
   the approval holds. A tag ruleset makes it noisier, which is worth the
   minutes.
3. **A1 or A2 can squat a version number with a staged package.** That denies the
   next real release until the maintainer rejects it with 2FA [19]. Annoyance,
   not breach.
4. **Two Actions on mutable tags.** Small once install scripts no longer hold a
   credential in the same job; still worth pinning.
5. **No GitHub Releases, so no release assets to tamper with.** Nothing to do.

---

## 7. Ranked recommendations

Highest risk reduction per unit of effort first.

1. **Approve releases from evidence.** `npm stage download`, hash it, compare
   with a tarball packed from a clean checkout of the signed tag, approve from a
   device that is not the laptop. Minutes per release, no code, and it is the
   only control that reaches A1, A2, A3 and A5.
2. **Two npm settings and a hardware key.** Turn on "Require two-factor
   authentication and disallow tokens" for both packages [17], and move 2FA to a
   security key if it is TOTP today [24]. Minutes, and it removes the replayable
   secret from the laptop.
3. **Split the workflow into an unprivileged build job and a privileged stage
   job**, with `persist-credentials: false` and a clean-tree assertion before
   packing. About 30 lines, and it takes the OIDC credential away from install
   scripts.
4. **Pin both Actions to full-length SHAs**, turn on the repository setting that
   requires it, and allowlist `actions/*` and `github/*` [12][13]. Minutes plus
   Dependabot upkeep.
5. **Tag ruleset on `v*`** (restrict creations, updates, deletions to admins)
   **and a ruleset on `main`** (pull request required, no force pushes) [9].
   Minutes in the UI. Stops a future collaborator from tagging or rewriting, and
   turns A1's tampering into a visible event.
6. **Add the signature check as tamper evidence**, with the fingerprint asserted
   and both the tag and the commit verified, after tags are signed again. About
   twenty lines, and the newest tag in each repo is unsigned today. Worth it
   because it catches mistakes and creates a record, not because it is a
   boundary.
7. **Only when a second person gets write access:** move the release workflow
   into a repository they cannot write, or add the push ruleset that restricts
   `.github/workflows/**`. High cost, and pointless until there is someone to
   defend against.

**Do not do:** an environment with required reviewers on the publish job (no
authority to gate, and it is keyed on a name an editable workflow controls);
"Require signed commits" on `main` (does not pin a key, and the automation
cannot sign unattended); GPG-signed tags presented as the thing that stops a
compromised account.

---

## 8. What I could not source or verify

- **The npm account's second factor type.** `npm trust list` answered `EOTP`,
  which proves 2FA is on, not whether it is TOTP or WebAuthn. The
  recommendations above assume it might be TOTP.
- **The package-level "Publishing access" setting.** Reading it needs an
  authenticated session with an OTP, which I did not provide. Whether "disallow
  tokens" is already on is therefore unknown; the CLI notice about tokens that
  bypass 2FA being restricted suggests policy is moving, not the current state.
- **Availability of push rulesets on these repositories.** The ruleset docs
  state availability "for the GitHub Team plan in internal and private
  repositories" and do not say what a public repository on a personal plan gets
  [9]. I did not attempt a write to find out.
- **Whether the "Require actions to be pinned to a full-length commit SHA"
  setting can be enabled on a personal plan.** The API field exists and reads
  `false` [13]; I did not try to set it.
- **GitHub account security settings for `Y4shin`** (2FA method, passkeys,
  session lifetime). Not visible to me.
- **Whether "Require signed commits" applies to tag rulesets or only to branch
  rulesets.** The docs describe the rule in branch terms [9]; I did not test it.
- **The claim that npm provenance does not attest that the tarball's contents
  equal the commit's sources.** This is `(reasoning)` from what the SLSA
  predicate contains (workflow, ref, commit, tarball digest) plus the absence of
  a hermetic build, not from an explicit statement in the docs [22].
- **No web search tool was available.** Every source below was fetched by
  direct URL, so the set of sources is what I thought to look for, not an
  exhaustive search of what exists. In particular there may be newer npm or
  GitHub features that supersede parts of this.

---

## 9. Sources

1. Git, `git-verify-tag(1)`: https://git-scm.com/docs/git-verify-tag
2. Git, `git-verify-commit(1)`: https://git-scm.com/docs/git-verify-commit
3. Git, `git-config(1)`: `gpg.format`, `gpg.<format>.program`,
   `gpg.minTrustLevel`, `gpg.ssh.allowedSignersFile`, `gpg.ssh.revocationFile`:
   https://git-scm.com/docs/git-config
4. `actions/checkout` v4, README (`fetch-depth`, `persist-credentials`):
   https://github.com/actions/checkout/blob/v4/README.md
5. `actions/checkout` v4, `src/ref-helper.ts` (tag refspec, all-history
   refspec): https://github.com/actions/checkout/blob/v4/src/ref-helper.ts
6. `actions/checkout` v4, `src/git-command-manager.ts` (fetch arguments):
   https://github.com/actions/checkout/blob/v4/src/git-command-manager.ts
7. GitHub Docs, OpenID Connect (claims, per-job tokens, "a step or action in the
   workflow job can request a token"):
   https://docs.github.com/en/actions/concepts/security/openid-connect
8. GitHub Docs, About rulesets (bypass actors, branch and tag targeting):
   https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets
9. GitHub Docs, Available rules for rulesets (Restrict creations, Require signed
   commits, push ruleset availability):
   https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets
10. GitHub Docs, Managing environments for deployment (required reviewers,
    six-reviewer limit, self-review, auto-created environments, who can
    configure): https://docs.github.com/en/actions/managing-workflow-runs-and-deployments/managing-deployments/managing-environments-for-deployment
11. GitHub Docs, Deployments and environments (one approval suffices, deployment
    branch and tag rules, admin bypass):
    https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments
12. GitHub Docs, Secure use reference (pin Actions to a full-length commit SHA,
    workflow dependency lockfiles): https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions
13. GitHub Docs, Managing GitHub Actions settings for a repository (pin to SHA,
    allowlist, verified creators):
    https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository
14. GitHub Docs, Events that trigger workflows (`push`: commit pushed to the
    ref, workflows not merged into the default branch):
    https://docs.github.com/en/actions/reference/events-that-trigger-workflows
15. GitHub Docs, About commit signature verification:
    https://docs.github.com/en/authentication/managing-commit-signature-verification/about-commit-signature-verification
16. GitHub Docs, Locking action dependencies in a repository's workflows
    (availability: GitHub Enterprise Cloud):
    https://docs.github.com/en/actions/how-tos/secure-your-work/lock-workflow-dependencies
17. npm Docs, Trusted publishing (allowed actions, stage-only recommendation,
    disallow tokens, connection expiry, automatic provenance):
    https://docs.npmjs.com/trusted-publishers/
18. npm Docs, Staged publishing (`npm stage publish` needs no 2FA, approval does,
    `0.0.0-stage` placeholder):
    https://docs.npmjs.com/staged-publishing
19. npm Docs, `npm stage` CLI (2FA table per subcommand, `--otp`, proof of
    presence, shared semver index):
    https://docs.npmjs.com/cli/v11/commands/npm-stage
20. npm Docs, `npm config` (`allow-scripts`, `strict-allow-scripts`,
    `ignore-scripts`): https://docs.npmjs.com/cli/v11/using-npm/config
21. npm Docs, Scripts (the `npm ci` lifecycle order):
    https://docs.npmjs.com/cli/v11/using-npm/scripts
22. npm Docs, Generating provenance statements (Sigstore, transparency log):
    https://docs.npmjs.com/generating-provenance-statements
23. `actions/runner-images`, Ubuntu 24.04 image contents (`ubuntu-latest` is
    24.04, `gnupg2` 2.4.4, `openssh-client` 9.6p1):
    https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2404-Readme.md
24. npm Docs, Configuring two-factor authentication (security keys via WebAuthn,
    usable from web and CLI):
    https://docs.npmjs.com/configuring-two-factor-authentication
