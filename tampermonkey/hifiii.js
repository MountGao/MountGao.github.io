(async function() {
    'use strict'
    // https://mountgao.github.io/tampermonkey/hifini.js
    // 100回の後悔

    const pathname = window.location.pathname;
    const isHifiii = window.location.hostname === 'www.hifiii.com';

    const isPassForum = ['9', '16', '17', '18', '19'].some((item) => {
        return pathname.includes('/forum-' + item);
    })
    if (isPassForum) return;

    console.log('Hello MGJ-HIFINI');

    const KEY_TID = 'data-tid';
    const KEY_HREF = 'data-href';
    const KEY_STORE_MUSIC = '__MGJ_HIFINI_STORE_MUSIC';
    const KEY_STORE_MUSIC_MINUTES = '__MGJ_HIFINI_STORE_MUSIC_MINUTES';
    const STORE_MUSIC_MINUTES_DEF = 60;
    const KEY_LOAD_MUSIC_STEP = '__MGJ_HIFINI_LOAD_MUSIC_STEP';
    const LOAD_MUSIC_STEP_DEF = 10;
    const LOAD_MUSIC_STEP_MIN = 1;
    const KEY_PLAYER_FIXED = '__MGJ_HIFINI_PLAYER_FIXED';
    const FIXED_MODE_Y = 'Y';
    const FIXED_MODE_N = 'N';
    const KEY_STORE_MUSIC_TAGS = '__MGJ_HIFINI_MUSIC_TAGS';
    const KEY_STORE_FAVORITES_MUSIC  = '__MGJ_HIFINI_FAVORITES_MUSIC';

    function superDecodeHifiii(str){
        return atob(str).replace(/[a-zA-Z]/g, c=>String.fromCharCode(c.charCodeAt(0)+(c.toLowerCase()<'n'?13:-13)));
    }

    function sleep(ms = 1000) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    function isValidNumber(val) {
        return /^\d+$/.test(val);
    }

    function isFixedMode() {
        return localStorage.getItem(KEY_PLAYER_FIXED) === FIXED_MODE_Y;
    }

    function getStoreMusicMinutes() {
        const localVal = localStorage.getItem(KEY_STORE_MUSIC_MINUTES);
        let num = STORE_MUSIC_MINUTES_DEF;
        if (typeof localVal === 'string' && isValidNumber(localVal)) {
            num = parseInt(localVal);
        }
        return num;
    }

    function getLoadMusicStep() {
        const localVal = localStorage.getItem(KEY_LOAD_MUSIC_STEP);
        let num = LOAD_MUSIC_STEP_DEF;
        if (typeof localVal === 'string' && isValidNumber(localVal)) {
            num = parseInt(localVal);
        }
        return num;
    }

    function storeMusic2Local(id, music) {
        let ret = null;
        try {
            const data = JSON.parse(localStorage.getItem(KEY_STORE_MUSIC) || '{}');
            ret = music ? {
                st: Date.now(),
                artist: music.artist || music.author,
                cover: music.cover || music.pic,
                name: music.name || music.title,
                url: music.url
            } : null;
            data[id] = ret || undefined;
            localStorage.setItem(KEY_STORE_MUSIC, JSON.stringify(data));
        } catch (e) {
            console.log(`storeMusic2Local-error-${id}`, e);
            localStorage.removeItem(KEY_STORE_MUSIC);
        }
        return ret;
    }

    function getLocalMusicTag(tid) {
        const data = JSON.parse(localStorage.getItem(KEY_STORE_MUSIC_TAGS) || '{}');
        return data?.[tid];
    }

    function setLocalMusicTag(tid, musicTag) {
        try {
            const data = JSON.parse(localStorage.getItem(KEY_STORE_MUSIC_TAGS) || '{}');
            data[tid] = musicTag;
            localStorage.setItem(KEY_STORE_MUSIC_TAGS, JSON.stringify(data));
        } catch (e) {
            console.error('setLocalMusicTag-error', e);
        }
    }

    function getMusicFromWindow(contentWindow) {
        if (!contentWindow) return null;

        let music = contentWindow?.ap4?.music || contentWindow?.ap?.list?.audios?.[0];
        if (music) {
            return music;
        }

        const scripts = contentWindow?.document?.querySelectorAll('script');
        const apScriptTexts = [
            scripts?.['19']?.innerText,
            scripts?.['20']?.innerText,
            scripts?.['21']?.innerText
        ];
        const startStr = 'const ap = new APlayer';
        const apScript = apScriptTexts.find((item) => item?.startsWith(startStr));
        if (apScript) {
            let ap = null;
            const apScript2 = apScript.replace(startStr, 'ap = ');
            try {
                const apScript2Res = eval(apScript2);
                music = apScript2Res?.audio?.[0];
            } catch (e) {
                console.log(e);
            }
        }
        return music
    }

    function loadPlayerAsset(url = '') {
        return new Promise((resolve, reject) => {
            const suffix = url.split('.').at(-1);
            const tagName = suffix === 'css' ? 'link' : 'script';
            const el = document.createElement(tagName);

            el.setAttribute('crossorigin', 'anonymous');

            if (tagName === 'link') {
                el.href = url;
                el.rel = 'stylesheet';
            } else {
                el.src = url;
            }

            el.addEventListener('load', () => {
                resolve(true);
            })

            el.addEventListener('error', () => {
                reject(false);
            })

            document.head.append(el);
        });
    }

    function addLikeBtn2MusicPage(tid) {
        const box = document.querySelector('.main .card .card-body .media');
        if (box) {
            const btn = document.createElement('button');
            const likeText = '加入收藏';
            const dislikeText = '取消收藏';
            const favorites = JSON.parse(localStorage.getItem(KEY_STORE_FAVORITES_MUSIC) || '{}');
            let isLiked = !!favorites[tid];
            btn.classList = 'btn btn-primary';
            btn.innerText = isLiked ? dislikeText : likeText;
            box.appendChild(btn);
            btn.addEventListener('click', function() {
                if (isLiked) {
                    delete favorites[tid];
                } else {
                    favorites[tid] = box.querySelector('.media-body h4')?.innerText || tid;
                }
                localStorage.setItem(KEY_STORE_FAVORITES_MUSIC, JSON.stringify(favorites));
                isLiked = !isLiked;
                btn.innerText = isLiked ? dislikeText : likeText;
            });
        }
    }

    function displayFavoritesModal(bool = false) {
        const modal = document.querySelector('#mgj-favorite-modal');
        const backdrop = document.querySelector('#mgj-modal-backdrop-favorite');
        if (bool) {
            modal.style.display = 'block';
            modal.classList.add('show');
            backdrop.style.display = 'block';
            backdrop.classList.add('show');
        } else {
            modal.style.display = 'none';
            modal.classList.remove('show');
            backdrop.style.display = 'none';
            backdrop.classList.remove('show');
        }
    }

    function addFavoriteList2Page() {
        const scrollToList = document.querySelector('#scroll_to_list');
        const div = document.createElement('div');
        div.innerHTML = `<a href="javascript:void(0);" class="mui-rightlist"><span><i class="icon-heart"></i></span></a>`;
        scrollToList.appendChild(div);
        const modalFavoritesHtml = `<div>
      <div class="modal-backdrop fade" id="mgj-modal-backdrop-favorite"></div>
      <div class="modal fade" id="mgj-favorite-modal">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">收藏列表</h5>
              <button type="button" class="close"><span>×</span></button>
            </div>
            <div class="modal-body" style="max-height: 80vh;overflow: auto"></div>
          </div>
        </div>
      </div>
    </div>`;
        const modalSelector = '#mgj-favorite-modal';
        let loaded = false;
        let modal = document.querySelector(modalSelector);
        div.addEventListener('click', function() {
            if (!modal) {
                document.body.insertAdjacentHTML('beforeend', modalFavoritesHtml);
                modal = document.querySelector(modalSelector);
                modal.querySelector('.modal-header button').addEventListener('click', function() {
                    displayFavoritesModal();
                });
            }

            if (!loaded) {
                const favorites = JSON.parse(localStorage.getItem(KEY_STORE_FAVORITES_MUSIC) || '{}');
                const innerHTML = Object.keys(favorites).map((key) => {
                    return `<a href="thread-${key}.htm" target="_blank" class="text-truncate" style="display: block;margin-bottom: 10px">${key}-${favorites[key]}</a>`;
                });
                modal.querySelector('.modal-body').innerHTML = innerHTML.join('');
                loaded = true;
            }

            displayFavoritesModal(true);
        });
    }

    if (pathname.includes('/thread-')) {
        if (window.parent !== window.self) return;

        const tid = document.querySelector(`[${KEY_TID}]`)?.getAttribute(KEY_TID);
        addLikeBtn2MusicPage(tid);
        addFavoriteList2Page();

        if (tid && getStoreMusicMinutes() > 0) {
            if (isHifiii) {
                const musicTag = getMusicTagFromHifiii(window);
                if (musicTag) {
                    setLocalMusicTag(tid, musicTag);
                }
                return;
            }

            const music = getMusicFromWindow(window);
            if (music) {
                storeMusic2Local(tid, music);
            }
        }
        return;
    }

    function getMusic(musicDetailLink, tid) {
        return new Promise(async (resolve) => {
            if (isHifiii) {
                const musicTag = getLocalMusicTag(tid);
                if (musicTag) {
                    const music = await getMusicFromHifiii(musicTag);
                    resolve(music);
                    return;
                }
            }

            const iframe = document.createElement('iframe');
            iframe.src = musicDetailLink;
            iframe.width = '0';
            iframe.height = '0';
            iframe.frameborder = '0';

            iframe.addEventListener('load', async () => {
                await sleep(500);

                if (isHifiii) {
                    const musicTag = getMusicTagFromHifiii(iframe?.contentWindow);
                    if (musicTag) {
                        setLocalMusicTag(tid, musicTag);
                        const music = await getMusicFromHifiii(musicTag);
                        if (music) {
                            resolve(music);
                        } else {
                            resolve(null);
                        }
                    } else {
                        resolve(null);
                    }
                }

                if (!isHifiii) {
                    const music = getMusicFromWindow(iframe?.contentWindow);
                    if (music) {
                        resolve(music);
                    } else {
                        resolve(null);
                    }
                }

                iframe.remove();
            })

            iframe.addEventListener('error', () => {
                resolve(null);
                iframe.remove();
            })

            document.body.append(iframe);
        }).catch(e => e);
    }

    function getMusicFromHifiii(musicTag) {
        return new Promise(async (resolve) => {
            try {
                const musicTags = [musicTag];
                const parseApi = 'plugin/clih_music/api/parse_music.php';
                const res = await fetch(parseApi, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(musicTags)
                });

                if(!res.ok) {
                    console.log(`请求失败，状态码：${res.status}`);
                    resolve(null);
                    return;
                }

                const result = await res.json();
                if(result.code !== 0) {
                    console.log('音乐解析失败1', JSON.stringify(musicTag), result.msg);
                    resolve(null);
                    return;
                }

                const music = result?.data?.[0];
                if (music?.url) {
                    music.pic = superDecodeHifiii(music.pic);
                    music.url = superDecodeHifiii(music.url);
                    resolve(music);
                    return;
                }

                console.log('音乐解析失败2', JSON.stringify(musicTag));
                resolve(null);
            } catch(e) {
                console.error('音乐加载失败3', JSON.stringify(musicTag), e);
            }
        });
    }

    function getMusicTagFromHifiii(contentWindow) {
        if (!contentWindow) return null;

        const scripts = contentWindow?.document?.querySelectorAll('script');
        const apScriptTexts = [
            scripts?.[5]?.innerText,
        ];
        const startStr = `\ndocument.addEventListener('DOMContentLoaded', function() {\n    const musicTags =`;
        const apScript = apScriptTexts.find((item) => item?.startsWith(startStr));
        if (apScript) {
            const regex = /const\s+musicTags\s*=\s*\[([\s\S]*?)\];/;
            const match = apScript.match(regex);
            let result = undefined

            if (match) {
                const jsonString = match[1].trim();
                try {
                    result = JSON.parse(`[${jsonString}]`)[0];
                } catch (e) {
                    console.error(e);
                }
            }
            return result;
        }
    }

    async function startWork() {
        addFavoriteList2Page();

        await sleep();

        const musicList = Array.from(document.querySelectorAll(`[${KEY_TID}][${KEY_HREF}]`))
            .filter((item) => {
                const cl = item.classList;
                const isSP = cl.contains('zun');
                const isTop = cl.contains('top_1') || cl.contains('top_2') || cl.contains('top_3');
                const lockEl = item.querySelector('.media-body .subject .icon-lock');
                const rewardEl = item.querySelector('img[title="悬赏"]') || item.querySelector('img[title="已解决"]');
                return item.getAttribute(KEY_TID) && item.getAttribute(KEY_HREF) && !isSP && !isTop && !lockEl && !rewardEl;
            })

        if (musicList.length === 0) return

        const playerBox = document.createElement('div');
        const playerEl = document.createElement('div');
        musicList[0].parentNode.before(playerBox);
        playerBox.append(playerEl);

        let [cssLoaded, jsLoaded] = await Promise.all([
            loadPlayerAsset('https://unpkg.com/aplayer@1.10.1/dist/APlayer.min.css'),
            loadPlayerAsset('https://unpkg.com/aplayer@1.10.1/dist/APlayer.min.js')
        ])
        if (!cssLoaded || !jsLoaded) {
            [cssLoaded, jsLoaded] = await Promise.all([
                loadPlayerAsset('https://cdn.jsdelivr.net/npm/aplayer@1.10.1/dist/APlayer.min.css'),
                loadPlayerAsset('https://cdn.jsdelivr.net/npm/aplayer@1.10.1/dist/APlayer.min.js')
            ]);
        }
        if (!cssLoaded || !jsLoaded) {
            [cssLoaded, jsLoaded] = await Promise.all([
                loadPlayerAsset('https://cdnjs.cloudflare.com/ajax/libs/aplayer/1.10.1/APlayer.min.css'),
                loadPlayerAsset('https://cdnjs.cloudflare.com/ajax/libs/aplayer/1.10.1/APlayer.min.js')
            ]);
        }

        if (!jsLoaded || !window.APlayer || !cssLoaded) {
            return playerEl.textContent = 'Load APlayer Failed!!!';
        }

        const myPlayer = new window.APlayer({
            container: playerEl,
            fixed: isFixedMode(),
            listFolded: false,
            listMaxHeight: 90,
            theme: '#699fea',
            volume: 0.5,
        });

        myPlayer.on('error', () => {
            console.log('APlayer-error');
            const musicIdCurr = myPlayer?.list?.audios?.[myPlayer?.list?.index]?.id;
            if (musicIdCurr) {
                storeMusic2Local(musicIdCurr);
            }
        })

        let loadIndex = 0;
        let loadDone = false;
        let isLoading = false;
        let loadMusicStep = getLoadMusicStep();
        let storeMusicMinutes = getStoreMusicMinutes();

        function isStoreMusicExpired(st) {
            return Date.now() >= st + 1000 * 60 * storeMusicMinutes;
        }

        function cleanLocalMusic() {
            if (storeMusicMinutes <= 0) return

            try {
                const data = JSON.parse(localStorage.getItem(KEY_STORE_MUSIC) || '{}')
                if (!Object.keys(data).length) return

                for (let [key, value] of Object.entries(data)) {
                    if (isLoading) return

                    if (isStoreMusicExpired(value.st)) {
                        data[key] = undefined;
                    }
                }

                localStorage.setItem(KEY_STORE_MUSIC, JSON.stringify(data));
            } catch (e) {
                console.log('cleanLocalMusic-error', e);
                localStorage.removeItem(KEY_STORE_MUSIC);
            }
        }

        function getLocalMusicById(id) {
            if (storeMusicMinutes <= 0) return null;

            let music = null;
            try {
                const data = JSON.parse(localStorage.getItem(KEY_STORE_MUSIC) || '{}')
                music = data?.[id];
                if (music && isStoreMusicExpired(music.st)) {
                    music = null;
                }
            } catch (e) {
                console.log(`getMusicFromLocal-error-${id}`, e);
            }
            return music;
        }

        async function loadList() {
            for (const item of musicList.slice(loadIndex, loadIndex + loadMusicStep)) {
                const tid = item.getAttribute(KEY_TID);
                let music = getLocalMusicById(tid);
                if (!music) {
                    music = await getMusic(item.getAttribute(KEY_HREF), tid);
                    if (music && storeMusicMinutes > 0) {
                        music = storeMusic2Local(tid, music) || music;
                    }
                }
                if (music) {
                    myPlayer.list.add(music);
                    if (myPlayer.paused === true) {
                        myPlayer.play();
                    }
                }
            }
            loadIndex += loadMusicStep;
            loadDone = loadIndex >= musicList.length;
        }

        const loadBtnHtml = `<div class="mgj-action-box">
      <button class="btn btn-primary btn-block" id="btn-load-more">加载更多</button>
      <div style="position:absolute;margin-top:-30px;margin-left:2px;z-index:1;">
        <button type="button" class="btn btn-default btn-sm" id="mgj-btn-setting">设置</button>
      </div>
    </div>`;

        playerBox.insertAdjacentHTML('beforeend', loadBtnHtml);

        const loadBtn = document.querySelector('#btn-load-more');
        loadBtn.addEventListener('click', async (evt) => {
            evt.stopPropagation();

            loadBtn.disabled = true;
            loadBtn.classList.replace('btn-primary', 'btn-secondary');

            if (!loadDone) {
                loadBtn.textContent = '正在加载...';
                isLoading = true;

                await loadList();

                isLoading = false;

                if (!loadDone) {
                    loadBtn.textContent = `[${myPlayer.list.audios.length}] 加载更多`;
                    loadBtn.disabled = false;
                    loadBtn.classList.replace('btn-secondary', 'btn-primary');
                }
            }

            if (loadDone) {
                loadBtn.textContent = `(${myPlayer.list.audios.length}) 加载完毕`;
            }

            if (myPlayer.list.audios.length && myPlayer.paused === true && loadIndex <= loadMusicStep) {
                myPlayer.play();
            }

            cleanLocalMusic();
        })
        loadBtn.click();

        let backdropSetting = null;
        let modalSetting = null;

        function displaySettingModal(bool = false) {
            if (bool) {
                modalSetting.style.display = 'block';
                modalSetting.classList.add('show');
                backdropSetting.style.display = 'block';
                backdropSetting.classList.add('show');
            } else {
                modalSetting.style.display = 'none';
                modalSetting.classList.remove('show');
                backdropSetting.style.display = 'none';
                backdropSetting.classList.remove('show');
            }
        }

        document.querySelector('#mgj-btn-setting').addEventListener('click', () => {
            if (!modalSetting) {
                const modalSettingHtml = `<div>
          <div class="modal-backdrop fade" id="mgj-modal-backdrop"></div>
          <div class="modal fade" id="mgj-setting-modal">
            <div class="modal-dialog modal-dialog-centered">
              <div class="modal-content">
                <div class="modal-header">
                  <h5 class="modal-title">设置</h5>
                </div>
                <div class="modal-body">
                  <form>
                    <div class="input-group">
                      <div class="input-group-prepend">
                        <span class="input-group-text">缓存歌曲的时长(分钟)</span>
                      </div>
                      <input type="number" class="form-control" id="mgj-input-store-time">
                    </div>
                    <div class="input-group mt-4">
                      <div class="input-group-prepend">
                        <span class="input-group-text">单次加载歌曲的数量</span>
                      </div>
                      <input type="number" class="form-control" id="mgj-input-load-step">
                    </div>
                  </form>
                </div>
                <div class="modal-footer justify-content-center">
                  <button type="button" class="btn btn-primary mgj-btn-fixed">${isFixedMode() ? '普通' : '吸底'}模式</button>
                  <button type="button" class="btn btn-primary ml-4 mgj-btn-save">保 存</button>
                  <button type="button" class="btn btn-secondary ml-4 mgj-btn-close">关 闭</button>
                </div>
              </div>
            </div>
          </div>
      </div>`;
                document.body.insertAdjacentHTML('beforeend', modalSettingHtml);
                backdropSetting = document.querySelector('#mgj-modal-backdrop');
                modalSetting = document.querySelector('#mgj-setting-modal');
            }

            const inputStoreTime = document.querySelector('#mgj-input-store-time');
            const inputLoadStep = document.querySelector('#mgj-input-load-step');

            inputStoreTime.value = storeMusicMinutes.toString();
            inputLoadStep.value = loadMusicStep.toString();

            displaySettingModal(true);

            modalSetting.querySelector('.mgj-btn-close').addEventListener('click', () => {
                displaySettingModal();
            })

            modalSetting.querySelector('.mgj-btn-fixed').addEventListener('click', () => {
                localStorage.setItem(KEY_PLAYER_FIXED, isFixedMode() ? FIXED_MODE_N : FIXED_MODE_Y);
                window.location.reload();
            })

            modalSetting.querySelector('.mgj-btn-save').addEventListener('click', () => {
                const storeTimeVal = inputStoreTime.value;
                const loadStepVal = inputLoadStep.value;
                if (storeTimeVal === undefined || storeTimeVal === '') {
                    alert('请输入缓存时长');
                    return
                }
                if (!isValidNumber(storeTimeVal)) {
                    alert('缓存时长必须是数字');
                    return
                }
                if (loadStepVal === undefined || loadStepVal === '') {
                    alert('请输入单次加载数量');
                    return
                }
                if (!isValidNumber(loadStepVal)) {
                    alert('单次加载数量必须是数字');
                    return
                }

                const storeTimeNum = parseInt(storeTimeVal);
                if (storeTimeNum <= 0) {
                    localStorage.removeItem(KEY_STORE_MUSIC);
                }

                storeMusicMinutes = storeTimeNum;
                localStorage.setItem(KEY_STORE_MUSIC_MINUTES, storeMusicMinutes);

                let loadStepNum = parseInt(loadStepVal);
                if (loadStepNum < LOAD_MUSIC_STEP_MIN) {
                    loadStepNum = LOAD_MUSIC_STEP_MIN;
                }

                loadMusicStep = loadStepNum;
                localStorage.setItem(KEY_LOAD_MUSIC_STEP, loadMusicStep);

                displaySettingModal();
            })
        })
    }

    window.addEventListener('load', startWork);
})();
