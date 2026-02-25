TODO: will do the low-hanging fruits first
- [ ] Add options to remove timestamps and/or comment overlays with n amount of timestamps to root out all certain comments that list out chapters, this moment, etc... which could clog up visual space and be unnecessary.
- [x] Only current timestamp glows when a comment overlay has multiple timestamps.
- [x] Make comment overlays that are long scroll to display more text, similar to preview.
- [ ] Somehow make a way for long comment overlays wait a bit more before disappearing, or let user manually "swipe" or something to hide them...
- [ ] Add options to change comment overlay position from top left to other directions.
- [ ] Add options to change comment overlay size.
- [ ] Comment overlay's width changes in uniform with other comment overlays (I might reconsider this).
- [x] When in full screen and scrolling through a timestamp, add-on should still scroll that timestamp instead of YouTube's More videos.
- [ ] Add a button next to video controls to quickly show/hide comment overlays (could conflict with other add-ons that add their own buttons, might find another solution).
- [x] Fix 1 of n comment (comments that share a timestamp) UI clipping at the bottom (not perfect but will fix it again).
- [x] Fix add-on not appearing unless user manually refresh YouTube tab once (fuck YouTube SPA).
- [ ] Make comment overlay change size when video is in normal/full screen/miniplayer.
- [ ] Show other data like display name, likes, replies, etc... and options to show/hide them the options menu. Maybe? ([return-yt-comment-usernames](https://github.com/Frank0945/return-yt-comment-usernames/blob/main/src/injected.ts), view code below)
- [ ] Keyboard shortcuts to navigate between each timestamps and comment overlays within them. Maybe?
- [ ] Remove "Pull up for precise thinking". Maybe.
- [ ] Fix preview and comment overlays with formatted text (bold, italic, strikethrough) rendering as normal text.
- [ ] Fix miniplayer breaking add-on.
- [ ] Fix YouTube's custom emojis not rendering as images (because YouTube treats Unicode and custom emojis as images) but as text.
- [x] Add support for replies.
- [ ] Add option to exclude replies.
- [x] Remove support for embedded videos (`/embed`).
- [ ] Give users the ability to choose between Innertube and YouTube Data API. Innertube is "plug-and-play" but can only fetch the first `maxResults` comments and replies, while YouTube Data API requires users to input their key through Google Cloud Console but fetches all comments of a video.
- [ ] Refactor codebase to make development easier (and migrate some of the consts at the top in `content.js` to `content.css`; it's a hot mess 😵‍💫).
- [ ] Make some UI adjustments in `content.css` and `options.html`.

---

test what Innertube returns (`node [FILE_NAME].mjs`)
```
const INNERTUBE_API_KEY = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8"
const INNERTUBE_CLIENT_NAME = "WEB"
const INNERTUBE_CLIENT_VERSION = "2.20211129.09.00"

const VIDEO_ID = "dQw4w9WgXcQ" // rickroll cuz y not

async function main() {
    const videoRes = await fetch(`https://www.youtube.com/watch?v=${VIDEO_ID}&pbj=1`, {
        headers: {
            "X-Youtube-Client-Name": "1",
            "X-Youtube-Client-Version": INNERTUBE_CLIENT_VERSION
        }
    })
    const videoData = await videoRes.json()

    const response = Array.isArray(videoData)
        ? videoData.find(e => e.response).response
        : videoData.response

    const token = response
        .contents.twoColumnWatchNextResults.results.results
        .contents.find(e => e.itemSectionRenderer?.sectionIdentifier === 'comment-item-section')
        .itemSectionRenderer.contents[0].continuationItemRenderer
        ?.continuationEndpoint.continuationCommand.token

    const body = {
        context: {
            client: {
                clientName: INNERTUBE_CLIENT_NAME,
                clientVersion: INNERTUBE_CLIENT_VERSION
            }
        },
        continuation: token
    }

    const commentsRes = await fetch(`https://www.youtube.com/youtubei/v1/next?key=${INNERTUBE_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    })

    const commentsData = await commentsRes.json()

    import('fs').then(fs => {
        fs.writeFileSync('response.json', JSON.stringify(commentsData, null, 2))
    })
}

main().catch(console.error)
```
