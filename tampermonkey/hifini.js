(async function () {
    'use strict';

    if (window.location.pathname.includes('thread-')) return

    console.log('Hello Hifini')

    const sleep = async (sec = 1000) => {
        await new Promise((resolve) => { setTimeout(() => resolve(), sec) })
    }

    const startWork = async () => {
        await sleep()

        const KEY_HREF = 'data-href'
        const KEY_TID = 'data-tid'

        const musicList = Array.from(document.querySelectorAll(`[${KEY_TID}][${KEY_HREF}]`))
            .filter((item) => {
                return item.getAttribute(KEY_TID) && item.getAttribute(KEY_HREF) && !item.classList.contains('top_3')
            })

        if (musicList.length === 0) return

        const playerEl = document.createElement('div')
        musicList[0].parentNode.before(playerEl)

        async function loadPlayerAsset(url = '') {
            return await new Promise((resolve, reject) => {
                const suffix = url.split('.').at(-1)
                const tagName = suffix === 'css' ? 'link' : 'script'
                const el = document.createElement(tagName)

                el.setAttribute('crossorigin', 'anonymous')

                if (tagName === 'link') {
                    el.href = url
                    el.rel = 'stylesheet'
                } else {
                    el.src = url
                }

                el.addEventListener('load', () => {
                    resolve(true)
                })

                el.addEventListener('error', () => {
                    reject(false)
                })

                document.head.append(el)
            })
        }

        let [cssLoaded, jsLoaded] = await Promise.all([
            loadPlayerAsset('https://unpkg.com/aplayer@1.10.1/dist/APlayer.min.css'),
            loadPlayerAsset('https://unpkg.com/aplayer@1.10.1/dist/APlayer.min.js')
        ])
        if (!cssLoaded || !jsLoaded) {
            [cssLoaded, jsLoaded] = await Promise.all([
                loadPlayerAsset('https://cdn.jsdelivr.net/npm/aplayer@1.10.1/dist/APlayer.min.css'),
                loadPlayerAsset('https://cdn.jsdelivr.net/npm/aplayer@1.10.1/dist/APlayer.min.js')
            ])
        }
        if (!cssLoaded || !jsLoaded) {
            [cssLoaded, jsLoaded] = await Promise.all([
                loadPlayerAsset('https://cdnjs.cloudflare.com/ajax/libs/aplayer/1.10.1/APlayer.min.css'),
                loadPlayerAsset('https://cdnjs.cloudflare.com/ajax/libs/aplayer/1.10.1/APlayer.min.js')
            ])
        }

        if (!jsLoaded || !window.APlayer || !cssLoaded) {
            return playerEl.textContent = 'Load APlayer Failed!!!'
        }

        const myPlayer = new window.APlayer({
            container: playerEl,
            fixed: false,
            mini: false,
            autoplay: false,
            preload: 'auto',
            volume: 0.5,
            mutex: true,
            theme: '#ad7a86',
            listFolded: false,
            listMaxHeight: 90,
        })

        myPlayer.on('error', () => {
            console.log('APlayer-error')
            const musicIdCurr = myPlayer?.list?.audios?.[myPlayer?.list?.index]?.id
            musicIdCurr && storeMusic2Local(musicIdCurr)
        })

        const loadStep = 10
        let loadIndex = 0
        let loadDone = false

        const getMusic = (musicDetailLink) => {
            return new Promise((resolve) => {
                const iframe = document.createElement('iframe')
                iframe.src = musicDetailLink
                iframe.width = '0'
                iframe.height = '0'
                iframe.frameborder = '0'

                iframe.addEventListener('load', async () => {
                    await sleep()

                    const music = iframe?.contentWindow?.ap4?.music || iframe?.contentWindow?.ap?.list?.audios?.[0]
                    if (music) {
                        resolve(music)
                    } else {
                        resolve(null)
                    }

                    iframe.remove()
                })

                iframe.addEventListener('error', () => {
                    resolve(null)
                    iframe.remove()
                })

                document.body.append(iframe)
            }).catch(e => e)
        }

        const STORE_KEY_MUSIC = '__HIFINI_MUSIC'

        const storeMusic2Local = (id, music) => {
            try {
                const data = JSON.parse(sessionStorage.getItem(STORE_KEY_MUSIC) || '{}')
                data[id] = music ? {
                    id: id,
                    artist: music.artist || music.author,
                    cover: music.cover || music.pic,
                    name: music.name || music.title,
                    url: music.url,
                } : undefined
                sessionStorage.setItem(STORE_KEY_MUSIC, JSON.stringify(data))
            } catch (e) {
                console.log(`storeMusic2Local-error-${id}`, e)
                sessionStorage.removeItem(STORE_KEY_MUSIC)
            }
        }

        const getLocalMusicById = (id) => {
            let music = null
            try {
                const data = JSON.parse(sessionStorage.getItem(STORE_KEY_MUSIC) || '{}')
                music = data?.[id]
            } catch (e) {
                console.log(`getMusicFromLocal-error-${id}`, e)
            }
            return music
        }

        const loadList = async () => {
            for (const item of musicList.slice(loadIndex, loadIndex + loadStep)) {
                const id = item.getAttribute(KEY_TID)
                let music = getLocalMusicById(id)
                if (!music) {
                    music = await getMusic(item.getAttribute(KEY_HREF))
                    music && storeMusic2Local(id, music)
                }
                music && myPlayer.list.add(music)
            }
            loadIndex += loadStep
            loadDone = loadIndex >= musicList.length
        }

        const loadBtn = document.createElement('button')
        loadBtn.classList.add('btn', 'btn-primary', 'btn-block')
        loadBtn.style.boxSizing = 'border-box'
        loadBtn.textContent = '加载更多'

        loadBtn.addEventListener('click', async (evt) => {
            evt.stopPropagation()

            loadBtn.disabled = true
            loadBtn.classList.replace('btn-primary', 'btn-secondary')

            if (!loadDone) {
                loadBtn.textContent = '正在加载...'

                await loadList()

                if (!loadDone) {
                    loadBtn.textContent = '加载更多'
                    loadBtn.disabled = false
                    loadBtn.classList.replace('btn-secondary', 'btn-primary')
                }
            }

            if (loadDone) {
                loadBtn.textContent = '加载完毕'
            }
        })

        playerEl.querySelector('.aplayer-list').append(loadBtn)

        loadBtn.click()
    }

    window.addEventListener('load', startWork)
})();
