# IPFEST 2026

## Introduction
Ini adalah repository untuk pengembangan website IPFEST 2026. Laman website terdiri dari home/landing page, login page, registration page, events page, dan competitions page.

## Directory Structure
Struktur folder pengembangan saat ini:
```plaintext
/ipfest26web
|
├──/.github
|	└──/worksflow
|		├──firebase-hosting-merge.yml
|		└──firebase-hosting-pull-request.yml
|
├──/functions
|	├──.gitignore
|	├──index.js
|	├──package-lock.json
|	└──package.json
|
├──/public
|	├──/competitions
|	|	├──business-case.html
|	|	├──geothermal-development-plan.html
|	|	├──mud-inovation.html
|	|	├──oil-rig-design.html
|	|	├──paper-and-poster.html
|	|	├──plan-of-development.html
|	|	├──smart-competition.html
|	|	└──well-design.html
|	|
|	├──/dashboard
|	|	├──compe-manager.html
|	|	├──delegates-relation.html
|	|	├──delegates.html
|	|	└──treasury.html
|	|
|	├──/dist
|	|	└──bundle.js
|	|
|	├──/events
|	|	├──campus-visit.html
|	|	├──career-talk.html
|	|	├──class-visit.html
|	|	├──company-visit.html
|	|	├──competition-expo.html
|	|	├──discover-bandung.html
|	|	├──gala-dinner.html
|	|	├──grand-company.html
|	|	├──ipconvex.html
|	|	├──ipexpo.html
|	|	├──ipgl.html
|	|	├──iptraining-competitions.html
|	|	├──iptraining-excel.html
|	|	├──iptraining-software.html
|	|	├──petrocare-petroaid-and-healthcare.html
|	|	├──petrocare-save-street-child.html
|	|	└──solar-spark.html
|	|
|	├──/src
|	|	├──auth.js
|	|	└──index.js
|	|
|	├──/static
|	|	├──/css
|	|	├──/images
|	|	└──/js
|	|
|	├──404.html
|	├──home.html
|	├──index.html
|	├──login.html
|	└──register.html
|
├──.babelrc
├──.firebaserc
├──.gitignore
├──firebase.json
├──firestore.indexes.json
├──firestore.rules
├──package-lock.json
├──package.json
├──README.md
├──storage.rules
└──webpack.config.babel.js

```

### Public
Ini adalah folder utama. Pengembangan hampir seluruhnya akan dilakukan disini.
#### - competitions
Berisi file html yang memuat UI dari kompetisi IPFEST 2026
#### - dashboard
Berisi file html yang memuat UI dari laman dashboard admin IPFEST 2026. Terdiri atas laman admin untuk treasury, competition manager, delegates relation, dan delegates
#### - dist
Berisi file bundle JavaScript. `bundle.js` adalah hasil configurasi oleh `webpack.config.babel.js` dari file-file yang berasal dari folder `src`. Tujuannya adalah untuk minifikasi dan tree-shaking
#### - events
Berisi file html yang memuat UI dari event IPFEST 2026
#### - src
Berisi file JavaScript yang akan memuat logika backend yang diintegrasikan dengan Firebase. `index.js` akan menjadi entry point dari file-file lain (seperti `auth.js`, dll.) dan akan dikonfigurasi oleh webpack menjadi `bundle.js` di folder `dist`
#### - static
Berisi komponen statis untuk keperluan UI. Terdiri dari folder `css`, `images`, dan `js`. Folder `css` akan menjadi tempat untuk menyimpan file css untuk laman. Begitu pula dengan `images`. Sedangkan untuk `js`, ini akan menjadi tempat untuk menyimpan logika UI.

