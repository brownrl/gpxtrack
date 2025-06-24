# gpxtrack

A simple PWA to be installed on your phone, helping you follow a GPX track and see your position on it.

## Installation

1. Get the code from GitHub: `git clone 'https://github.com/brownrl/gpxtrack.git'`
2. Host it somewhere and browse to it with your phone. (Herd share?)
3. Save it to your home screen.

### OR...

Browse to https://brownrl.github.io/gpxtrack/ and save it to your home screen. It's a PWA, so it will save as an 'app' on your phone.

## Usage

1. Export a GPX file from your favorite app to your files.
2. Open the GPX app on your phone.
3. Tap the rocket icon in the bottom left corner.
4. Select the GPX file you exported.
5. Tap the recycle icon to use the last one you opened.
6. Start moving. I personally prefer to use a bicycle, but it works with walking too.

## Things to know

- Distance left will be shown in the top right corner.
- Press the magnifying glass to cycle through zoom levels.
- Press the lock button to toggle the phone from going to sleep.
- Press the globe button to open a drawer with quick links to Google Maps.

The globe button will open a drawer with quick links to Google Maps with certain types of locations already searched for you (lodging, restaurants, etc.).

### Demo Screenshot

![Demo Screenshot](https://brownrl.github.io/gpxtrack/demo.png)

You also have these screeshots:

- [Screenshot 1](https://brownrl.github.io/gpxtrack/screens/screen-01.png)
- [Screenshot 2](https://brownrl.github.io/gpxtrack/screens/screen-02.png)
- [Screenshot 3](https://brownrl.github.io/gpxtrack/screens/screen-03.png)
- [Screenshot 4](https://brownrl.github.io/gpxtrack/screens/screen-04.png)
 
## Features

- Minimalist design
- Battery efficient
- Dead simple to use
- Shows the direction of the track
- Shows distance left to the end of the track
- Quick links to Google Maps for nearby locations
- Quick reload of last used GPX file
- Keeps the phone awake while tracking or let it sleep
  
## Development

- Clone the repo.
- Create your own Mapbox API key at https://mapbox.com.
  - Add your API key to the `index.html` file.
  - My key is there, but it will only work for my domains.
- Ideally, I use the local domain name: 'gpxtrack.test'.
- Have fun and make your own Mapbox style.
- Start coding whatever you want. I am 100% open to PRs and ideas.