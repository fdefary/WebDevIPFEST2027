# Smart Competition exam: from local demo to live

Checklist for releasing the new preliminary round exam. For general Firebase setup, see [`firebase-production-setup.md`](firebase-production-setup.md).

This repository is **public**. Do not add passwords, private keys, participant details, personal contacts, exam questions, or answer keys to this file.

**Live status: not verified.** Nobody has checked this checklist against the live project yet. Tick a box only after checking it.

## Read first

- **Do not practise with real team accounts.** Each team gets one exam attempt, and the admin page has no reset. Opening the exam page while the team's time window is open starts the attempt.
- **Use clearly named test teams and test packets on the live site.** A packet that was ever assigned or used cannot be removed. Test teams appear in the admin team list.
- **Merging to `main` publishes only the website.** Functions, Rules, and indexes are deployed separately.
- **A pull request preview uses the live Firebase project.** Only `localhost` and `127.0.0.1` in development mode use the emulators.
- **Never run `npm run seed:exam:emulators` against the live project.** It is for the local demo only.

## 1. Demo and live

| | Local demo | Live |
|---|---|---|
| Address | `localhost:9000` with `npm run dev` | Live site, pull request previews, production builds, and any other address (including your computer's network IP) |
| Firebase project | `demo-ipfest-local` (emulators) | `ipfest-2027` |
| Accounts, teams, packets, sessions, attempts | Created by the seed script or by you; not copied to live | Real records |

To run the demo, install Node.js 22 and Java, then:

```sh
npm ci
npm --prefix functions ci
npm run dev:exam:emulators   # terminal 1
npm run seed:exam:emulators  # terminal 2: resets the demo and prints test logins
npm run dev                  # terminal 3
```

After running the seed script again, open a new browser tab for the team. An old tab can restore text typed before the reset.

## 2. Before release

- [ ] The branch contains the latest `main`.
- [ ] `npm test`, `npm --prefix functions test`, and `npm run build` pass.
- [ ] The pull request is reviewed.
- [ ] You know what is live now: website, Functions, Rules, and indexes.
- [ ] The project is on the Blaze plan and has budget alerts.
- [ ] The exam admin account has the `competition_manager` role for `smart competition` (setup guide, section 5).
- [ ] The Functions runtime service account can sign image links (`iam.serviceAccounts.signBlob`).

## 3. Existing teams

Teams registered in `ipfest-2027` do **not** need to register again if their record passes these checks. Leaders keep their email and password. No data needs to be moved.

- [ ] The record is in the `Team` collection.
- [ ] Its document ID is the leader's Firebase Auth UID.
- [ ] `competition` is exactly `smart competition`.
- [ ] It has `teamName` (the admin page uses this name).
- [ ] The team is on the organizers' approved list.

Notes:

- The exam does not check payment or registration status. Any assigned team can take it during its window, so **assign only approved teams**.
- The exam no longer uses `SC_Selection`. If that list decided who qualifies, use it when assigning teams.
- The exam server does not check email verification. From 5 December 2026 the main login requires a verified email, but the Smart Competition login (`loginsc.html`) does not. See open decisions.

## 4. Release order

Run from the repository root, using code that includes the latest `main`. Read the CLI plan before confirming, and stop if it proposes deleting something you did not expect.

1. **Indexes and Storage Rules.** These are the Rules and index files this exam branch changes. If the live Firestore Rules are behind `main`, deploy `firestore:rules` too.

   ```sh
   firebase deploy --only firestore:indexes,storage --project ipfest-2027
   ```

2. **Wait until the indexes finish building** (Firebase Console, Firestore, Indexes).

3. **The 14 exam Functions:**

   ```sh
   firebase deploy --only functions:createExamPacket,functions:listExamPackets,functions:getAdminExamPacket,functions:removeExamPacket,functions:assignExamSession,functions:getAdminExamData,functions:exportExamSubmissions,functions:getExamAssetUrl,functions:getParticipantExamSchedule,functions:getParticipantExamState,functions:saveParticipantDraft,functions:advanceExamQuestion,functions:submitExam,functions:finalizeSmartCompetitionExamAttempts --project ipfest-2027
   ```

   `finalizeSmartCompetitionExamAttempts` runs every minute, so the CLI also sets up Cloud Scheduler.

4. **Check** that all 14 appear in `asia-southeast2` and the logs show no errors.

5. **Merge to `main`** to publish the website.

**Never run `firebase deploy --only functions` without names.** It would also deploy the paused certificate and email Functions.

## 5. Live testing

Use at least three test teams that submit at the same time (one exam time slot). Record Pass or Fail.

| Check | Result |
|---|---|
| Admin signs in and reaches the exam admin page | |
| Packet import, review, save, and preview, including images | |
| Test teams sign in and see Start Test only during their window | |
| Question images load for each team | |
| Refresh keeps the current question and typed answer | |
| A short loss of connection reconnects correctly | |
| No answer is lost to a slow reply, including the first questions after a quiet period | |
| Every submitted answer matches the export | |
| An abandoned attempt finishes automatically | |
| CSV export opens correctly in the judges' spreadsheet app | |

**Known risk:** in a local practice run with two teams, one server reply took 19.7 seconds on a question with a 14 second limit. That answer was lost, even though the Functions had received warm-up calls. Live speed has not been measured.

## 6. Real exam setup

- [ ] Import each packet and check every question, category, answer key, and tolerance.
- [ ] Prepare one packet per team. The app allows reuse, so check this yourself.
- [ ] Assign each approved team a packet and a time window.
- [ ] Preview each packet.

A team can have only one session. An assigned session cannot be moved to another team, and its packet cannot change after the team starts.

## 7. Exam day (12 December 2026)

The guidebook rundown runs the exam stages from 09:05 to 12:25 (GMT+7), three teams per slot. It may change with the number of teams.

| Item | Plan | Owner |
|---|---|---|
| Watch session status and Function logs | | To be decided |
| Keep Functions running, if approved: when to start and stop, and turn it off afterwards to stop the charge | | To be decided |
| Team cannot sign in or start | | To be decided |
| Export results and send them to judges | | To be decided |

## 8. If something goes wrong

The recovery steps have not been tested.

- **Website:** Firebase Console, Hosting, release history, roll back. The previous exam page works differently and does not read new exam sessions, so rolling back does not give teams a working replacement exam.
- **Functions:** redeploy the named Functions from the last good commit.
- **Backup plan for the exam:** To be decided.
- **Who can delay the exam:** To be decided.

## 9. Open decisions

| Decision | Owner | Deadline |
|---|---|---|
| Which teams qualify (for example, only verified payment) | To be decided | |
| Must the exam require a verified email? This needs a code change | To be decided | |
| Exam length: the guidebook says both 7 and 10 minutes; the app's timers total 10 | To be decided | |
| List answers: partial points or not (the app marks only Correct or Incorrect) | To be decided | |
| Abbreviations: the guidebook generally allows them, automatic grading needs the saved wording | To be decided | |
| Sample packet answer key issue: confirm privately with the question author | To be decided | |
| One unique packet per team: who prepares them | To be decided | |
| Slow replies: paid always-running Functions, a grace period, or accept the risk | To be decided | |

Suggested timing: finish live testing before the technical meeting on 11 December. Registration closes on 8 December, so finish assigning teams after that.
