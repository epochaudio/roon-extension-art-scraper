// Copyright 2020 The Appgineer
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

"use strict";

const ALBUM = 1;
const ARTIST = 2;

const ALBUMS = 'Albums';
const ARTISTS = 'Artists';

const mkdirp          = require('mkdirp'),
      fs              = require('fs'),
      RoonApi         = require('node-roon-api'),
      RoonApiSettings = require('node-roon-api-settings'),
      RoonApiStatus   = require('node-roon-api-status'),
      RoonApiBrowse   = require('node-roon-api-browse'),
      RoonApiImage    = require('node-roon-api-image');

var core = undefined;
var artist_index = 0;
var artist_list = [];
var album_index = 0;
var album_list = [];
var skip_counter = 0;
var total_albums = 0;

var roon = new RoonApi({
    extension_id:    'com.theappgineer.art-scraper',
    display_name:    'Art Scraper',
    display_version: '0.1.1',
    publisher:       '门耳朵',
    email:           'sales@epochaudio.cn',
    website:         'https://www.epochaudio.cn',

    core_paired: function(core_) {
        core = core_;
        console.log('Core paired:', core.display_name);
    },
    core_unpaired: function(core_) {
        core = undefined;
        console.log('Core unpaired');
    }
});

var scrape_settings = roon.load_config("settings") || {
    image_size: 'MEDIUM',
    max_images: 1000
};

const IMAGE_SIZES = {
    SMALL: {
        width: 225,
        height: 225
    },
    MEDIUM: {
        width: 500,
        height: 500
    },
    LARGE: {
        width: 1000,
        height: 1000
    }
};

function makelayout(settings) {
    let l = {
        values:    settings,
        layout:    [],
        has_error: false
    };

    if (artist_index == artist_list.length && album_index == album_list.length) {
        l.layout.push({
            type:    "dropdown",
            title:   "Scrape for",
            values:  [
                { title: ARTISTS, value: ARTIST },
                { title: ALBUMS,  value: ALBUM }
            ],
            setting: "type"
        });

        l.layout.push({
            type:    "dropdown",
            title:   "Image Size",
            values:  [
                { title: "Small (225x225)",    value: "SMALL" },
                { title: "Medium (500x500)",   value: "MEDIUM" },
                { title: "Large (1000x1000)",  value: "LARGE" }
            ],
            setting: "image_size"
        });

        l.layout.push({
            type:    "integer",
            title:   "最大图片数量",
            min:     1,
            max:     10000,
            setting: "max_images"
        });
    } else {
        l.layout.push({
            type:  'group',
            title: 'There is currently an action in progress, try again later',
            items: []
        });
    }

    return l;
}

function refresh_browse(opts, path, cb) {
    opts = Object.assign({ hierarchy: "browse" }, opts);

    core.services.RoonApiBrowse.browse(opts, (err, r) => {
        if (err == false) {
            if (r.action == "list") {
                let list_offset = r.list.display_offset > 0 ? r.list.display_offset : 0;
                
                console.log(`正在加载专辑列表... 偏移量: ${list_offset}`);
                
                load_browse(list_offset, path, cb);
            }
        }
    });
}

function load_browse(list_offset, path, cb) {
    let opts = {
        hierarchy:          "browse",
        offset:             list_offset,
        set_display_offset: list_offset
    };

    core.services.RoonApiBrowse.load(opts, (err, r) => {
        if (err == false && path) {
            if (!r.list.level || !path[r.list.level - 1] || r.list.title == path[r.list.level - 1]) {
                if (!path[r.list.level]) {
                    if (cb) {
                        console.log(`已加载 ${r.items.length} 张专辑，总共 ${r.list.count} 张`);
                        
                        if (r.offset + r.items.length < r.list.count) {
                            load_browse(r.offset + r.items.length, path, cb);
                        }

                        cb(r.items, r.offset + r.items.length == r.list.count);
                    }
                } else {
                    for (let i = 0; i < r.items.length; i++) {
                        if (r.items[i].title == path[r.list.level]) {
                            refresh_browse({ item_key: r.items[i].item_key }, path, cb);
                            break;
                        }
                    }
                }
            }
        }
    });
}

function scrape_library() {
    console.log(`Starting scrape for type: ${scrape_settings.type}`);
    switch (scrape_settings.type) {
    case ARTIST:
        scrape_artists();
        break;
    case ALBUM:
        scrape_albums();
        break;
    }
}

function scrape_artists() {
    const opts = {pop_all: true};
    const path = ['Library', ARTISTS, ''];

    mkdirp(process.cwd() + `/art/${ARTISTS}`).then((made) => {
        refresh_browse(opts, path, (items, done) => {
            const remaining = scrape_settings.max_images - artist_list.length;
            if (remaining > 0) {
                const itemsToAdd = items.slice(0, remaining);
                artist_list = artist_list.concat(itemsToAdd);
            }

            if (done || artist_list.length >= scrape_settings.max_images) {
                console.log(`总共将处理 ${artist_list.length} 位艺术家（最大限制：${scrape_settings.max_images}）`);
                store_image(ARTISTS, artist_list[artist_index].title, artist_list[artist_index].image_key, store_next_image);
            }
        });
    });
}

function scrape_albums() {
    const opts = {pop_all: true};
    const path = ['Library', ALBUMS, ''];

    mkdirp(process.cwd() + `/art/${ALBUMS}`).then((made) => {
        refresh_browse(opts, path, (items, done) => {
            const remaining = scrape_settings.max_images - album_list.length;
            if (remaining > 0) {
                const itemsToAdd = items.slice(0, remaining);
                album_list = album_list.concat(itemsToAdd);
            }
            
            if (done || album_list.length >= scrape_settings.max_images) {
                total_albums = album_list.length;
                console.log(`总共将处理 ${total_albums} 张专辑（最大限制：${scrape_settings.max_images}）`);
                
                if (album_list.length > 0) {
                    store_image(ALBUMS, album_list[album_index].title, album_list[album_index].image_key, store_next_image);
                }
            }
        });
    });
}

function store_next_image(type, error) {
    let entry;
    let fraction;

    console.log(`Processing ${type}, error: ${error}`);

    if (type == ARTISTS) {
        artist_index++;
        entry = artist_list[artist_index];
        fraction = artist_index / artist_list.length;
        console.log(`Artist progress: ${artist_index}/${artist_list.length}`);
    } else if (type == ALBUMS) {
        if (album_index >= album_list.length) {
            if (skip_counter) {
                svc_status.set_status(`Scraping done! (${skip_counter} skipped)`, false);
            } else {
                svc_status.set_status('Scraping done!', false);
            }
            reset_state();
            return;
        }

        entry = album_list[album_index];
        fraction = album_index / total_albums;
        console.log(`Album progress: ${album_index + 1}/${total_albums}`);
        album_index++;
    } else {
        return;
    }

    if (entry) {
        set_progress(type, Math.round(fraction * 100));
        store_image(type, entry.title, entry.image_key, store_next_image);
    }
}

function store_image(type, name, image_key, cb) {
    if (image_key) {
        const size = IMAGE_SIZES[scrape_settings.image_size] || IMAGE_SIZES.MEDIUM;
        
        const opts = {
            scale:  'fill',
            width:  size.width,
            height: size.height,
            format: 'image/jpeg'
        };

        name = name.replace(/[\?\/\"<>:]/g, '_');

        const MAX_RETRIES = 3;
        let retryCount = 0;

        const tryDownload = () => {
            core.services.RoonApiImage.get_image(image_key, opts, (error, content_type, image) => {
                if (error) {
                    if (retryCount < MAX_RETRIES) {
                        retryCount++;
                        console.log(`Retry ${retryCount} for ${name}`);
                        setTimeout(tryDownload, 1000 * retryCount);
                        return;
                    }
                    console.error(`Failed after ${MAX_RETRIES} retries:`, name, error);
                    skip_counter++;
                    cb && cb(type, error);
                } else {
                    fs.writeFile(`${process.cwd()}/art/${type}/${name}.jpg`, image, () => {
                        cb && cb(type);
                    });
                }
            });
        };

        tryDownload();
    } else {
        skip_counter++;
        cb && cb(type);
    }
}

function set_progress(type, progress) {
    svc_status.set_status(`Scraping library for ${type}... [${progress}%]`, false);
}

function init_signal_handlers() {
    const handle = function(signal) {
        process.exit(0);
    };

    // Register signal handlers to enable a graceful stop of the container
    process.on('SIGTERM', handle);
    process.on('SIGINT', handle);
}

function reset_state() {
    artist_index = 0;
    artist_list = [];
    album_index = 0;
    album_list = [];
    skip_counter = 0;
    svc_status.set_status("Ready", false);
}

var svc_settings = new RoonApiSettings(roon, {
    get_settings: function(cb) {
        cb(makelayout(scrape_settings));
    },
    save_settings: function(req, isdryrun, settings) {
        let l = makelayout(settings.values);
        req.send_complete(l.has_error ? "NotValid" : "Success", { settings: l });

        if (!isdryrun && !l.has_error) {
            scrape_settings = l.values;
            svc_settings.update_settings(l);
            roon.save_config("settings", scrape_settings);

            scrape_library();
        }
    }
});

var svc_status = new RoonApiStatus(roon);

roon.init_services({
    required_services: [ RoonApiBrowse, RoonApiImage ],
    provided_services: [ svc_settings, svc_status ]
});

reset_state();

init_signal_handlers();

roon.start_discovery();
