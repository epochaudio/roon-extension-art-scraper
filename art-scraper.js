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

var roon = new RoonApi({
    extension_id:    'com.theappgineer.art-scraper',
    display_name:    'Art Scraper',
    display_version: '0.1.0',
    publisher:       'The Appgineer',
    email:           'theappgineer@gmail.com',
    //website:         'https://community.roonlabs.com/t/roon-extension-art-scraper/???',

    core_paired: function(core_) {
        core = core_;
    },
    core_unpaired: function(core_) {
        core = undefined;
    }
});

var scrape_settings = roon.load_config("settings") || {
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
                let list_offset = r.list.display_offset > 0 ? r.list.display_offset : 0;;

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
                        if (r.offset + r.items.length < r.list.count) {
                            // Continue
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
            artist_list = artist_list.concat(items);

            if (done) {
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
            album_list = album_list.concat(items);

            if (done) {
                store_image(ALBUMS, album_list[album_index].title, album_list[album_index].image_key, store_next_image);
            }
        });
    });
}

function store_next_image(type, error) {
    let entry;
    let fraction;

    if (type == ARTISTS) {
        artist_index++
        entry = artist_list[artist_index];
        fraction = artist_index / artist_list.length;
    } else if (type == ALBUMS) {
        album_index++;
        entry = album_list[album_index];
        fraction = album_index / album_list.length;
    } else {
        return;
    }
    
    if (fraction < 1) {
        set_progress(type, Math.round(fraction * 100));

        store_image(type, entry.title, entry.image_key, store_next_image);
    } else {
        if (skip_counter) {
            svc_status.set_status(`Scraping done! (${skip_counter} skipped)`, false);
        } else {
            svc_status.set_status('Scraping done!', false);
        }

        artist_index = 0;
        artist_list = [];
        album_index = 0;
        album_list = [];
        skip_counter = 0;
   }
}

function store_image(type, name, image_key, cb) {
    if (image_key) {
        const opts = {
            scale:  'fill',
            width:  (type == ARTISTS ? 300 : 225),
            height: 225,
            format: 'image/jpeg'
        };
        
        name = name.replace(/[\?\/\"<>:]/g, '_');

        core.services.RoonApiImage.get_image(image_key, opts, (error, content_type, image) => {
            if (error) {
                console.error(error, name);
                skip_counter++;
                
                cb && cb(type, error);
            } else {
                fs.writeFile(`${process.cwd()}/art/${type}/${name}.jpg`, image, () => {
                    cb && cb(type);
                });
            }
        });
    } else {
        skip_counter++;
    }
}

function set_progress(type, progress) {
    svc_status.set_status(`Scraping library for ${type}... [${progress}%]`, false);
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

roon.start_discovery();
