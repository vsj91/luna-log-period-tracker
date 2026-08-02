# Luna Log Period Tracker

A small privacy-first period tracker that runs as a static website. Period entries, symptoms, notes, and predictions are stored only in the current browser or mobile device with `localStorage`.

## Features

- Add current or previous period start dates and optional end dates.
- Track symptoms and notes.
- See average cycle length, average period length, and next-period estimate based on saved history.
- Export and import a JSON backup for moving data between devices.
- Clear all locally stored data from the browser.

## Publish With GitHub Pages

1. Create a new GitHub repository.
2. Push these files to the repository's `main` branch.
3. In GitHub, open **Settings -> Pages**.
4. Set the source to **Deploy from a branch**, choose `main`, and choose `/root`.
5. Save. GitHub will publish the tracker as a Pages site.

## Privacy

The app has no backend and does not send data anywhere. Current and previous period entries are kept in browser `localStorage` on the device. Browser storage is device-local, so data can be lost if the browser storage is cleared. Use **Export** to keep a backup.
