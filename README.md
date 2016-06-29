oab-chromeaddon
===============

Open Access Button Chrome Extension

**Note: To improve user experience, this will soon be replaced with a cross-platform and re-themeable [unified extension](https://github.com/OAButton/unified-extension).**

### packaging for firefox
Firefox requires extra keys in the manifest, and the project files zip archived with extension ```.xpi```. The script ```pack_ffx.py``` does this. Supply the required [extension ID](https://developer.mozilla.org/en-US/Add-ons/Install_Manifests#id).
```./pack_ffx.py -i oab-ffx@openaccessbutton.org```
