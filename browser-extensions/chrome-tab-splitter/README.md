# Enhanced Split View for Chrome
This scripts adds extra control over Chrome's native split view function, which allows to pin a source tab to open new content on the side.

## Features
1. Shortcut: Hold CTRL (by default) and click middle button to create a SOURCE tab on the current tab
2. Drag and Drop: Once there's a source, hold to drag over the middle seam and there'll be a paired TARGET tab
3. Hotky customization: assign dedicated shortcut combo in script configuration panel

## How it Works
![chrome_split_view_preview](https://github.com/user-attachments/assets/03eb7aa7-02e3-474d-a60d-c2fd756ded71)

## Installation
* Make sure your Chrome support "Split View" already
  <br><img width="283" height="142" alt="image" src="https://github.com/user-attachments/assets/13fc0fae-485d-4934-aead-7fced7c3bbed" /></br>
* Install a userscript manager such as Install Tampermonkey (https://www.tampermonkey.net) or Violentmonkey.
* Create a new script and copy/paste the code from this repository.
* Open a new tab, hold CTRL and middle-button click to create a SOURCE tab, there'll be a S icon.
* Right-click to split view another tab, this is from native Chrome function so make sure your Chrome is ready.
* Hold S icon and drag over the middle seam to create a paired TARGET tab, there'll be a T icon.
* Try browse content side on the SOURCE tab, any new click is synced and opened on the TARGET tab.
