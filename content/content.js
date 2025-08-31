// CONFIGURATION //
const PREVIEW_DEFAULT_WIDTH     = 320
const PREVIEW_MAX_HEIGHT        = 175
const PREVIEW_MIN_HEIGHT        = 40
const PREVIEW_BORDER_SIZE       = 2
const PREVIEW_TOOLTIP_MARGIN    = 12
const PREVIEW_MARGIN            = 10
const PREVIEW_WIDTH_PADDING     = 5
const PREVIEW_PADDING_TOTAL     = 32
const PREVIEW_TEXT_MIN_HEIGHT   = 24
const WHEEL_SWITCH_THRESHOLD    = 100
const WHEEL_DEBOUNCE_MS         = 400
const SCROLL_TOLERANCE          = 1

main()
onLocationHrefChange(() => {
    removeBar()
    main()
})

function main() {
    const videoId = getVideoId()
    if (!videoId) return

    fetchTimeComments(videoId)
        .then(timeComments => {
            if (videoId === getVideoId()) {
                addTimeComments(timeComments)
            }
        })
}

function getVideoId() {
    if (window.location.pathname === '/watch') {
        return parseParams(window.location.href)['v']
    } else if (window.location.pathname.startsWith('/embed/')) {
        return window.location.pathname.substring('/embed/'.length)
    }
    return null
}

function getVideo() {
    return document.querySelector('#movie_player video')
}

function fetchTimeComments(videoId) {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({type: 'fetchTimeComments', videoId}, resolve)
    })
}

function addTimeComments(timeComments) {
    const bar = getOrCreateBar()
    const videoDuration = getVideo().duration
    const groupedComments = new Map()

    for (const tc of timeComments) {
        if (typeof tc.time !== 'number' || tc.time > videoDuration) continue

        const timeKey = tc.time.toString()
        if (!groupedComments.has(timeKey)) {
            groupedComments.set(timeKey, [])
        }
        groupedComments.get(timeKey).push(tc)
    }

    for (const [timeKey, commentsAtTime] of groupedComments) {
        const time = parseFloat(timeKey)
        const stamp = createTimestampStamp(time, videoDuration, commentsAtTime)
        bar.appendChild(stamp)
    }
}

function createTimestampStamp(time, videoDuration, commentsAtTime) {
    const stamp = document.createElement('div')
    stamp.classList.add('__youtube-timestamps__stamp')

    if (commentsAtTime.length > 1) {
        stamp.classList.add('__youtube-timestamps__stamp--multiple')
    }

    const offset = time / videoDuration * 100
    stamp.style.left = `calc(${offset}% - 2px)`

    let currentCommentIndex = 0

    stamp.addEventListener('mouseenter', () => {
        showPreview(commentsAtTime[currentCommentIndex], commentsAtTime.length, currentCommentIndex)
    })

    stamp.addEventListener('mouseleave', hidePreview)

    stamp.addEventListener('wheel', withWheelThrottle((deltaY) => {
        handleWheelNavigation(deltaY, commentsAtTime, currentCommentIndex, (newIndex) => {
            currentCommentIndex = newIndex
        })
    }), { passive: false })


    const openCommentInNewTab = createDebouncedCommentOpener()
    stamp.addEventListener('auxclick', e => {
        if (e.button === 1) {
            e.preventDefault()
            e.stopPropagation()
            openCommentInNewTab(commentsAtTime[currentCommentIndex])
        }
    })

    return stamp
}

function handleWheelNavigation(deltaY, commentsAtTime, currentIndex, updateIndex) {
    const SWITCH_THRESHOLD = WHEEL_SWITCH_THRESHOLD
    const preview = getOrCreatePreview()
    const textElement = preview.querySelector('.__youtube-timestamps__preview__text')

    if (!preview || preview.style.display === 'none') {
        showPreview(commentsAtTime[currentIndex], commentsAtTime.length, currentIndex)
        return
    }

    const switchTo = (newIndex) => {
        updateIndex(newIndex)
        showPreview(commentsAtTime[newIndex], commentsAtTime.length, newIndex)
        const newText = document.querySelector('.__youtube-timestamps__preview__text')
        if (newText) newText.scrollTop = 0
    }

    if (textElement && textElement.scrollHeight > textElement.clientHeight) {
        const atTop = textElement.scrollTop <= SCROLL_TOLERANCE
        const atBottom = (textElement.scrollTop + textElement.clientHeight) >= (textElement.scrollHeight - SCROLL_TOLERANCE)

        if ((deltaY > 0 && !atBottom) || (deltaY < 0 && !atTop)) {
            textElement.scrollBy({ top: deltaY, left: 0, behavior: 'auto' })
            return
        }

        if (commentsAtTime.length > 1 && Math.abs(deltaY) >= SWITCH_THRESHOLD) {
            const direction = deltaY > 0 ? 1 : -1
            const newIndex = (currentIndex + direction + commentsAtTime.length) % commentsAtTime.length
            switchTo(newIndex)
        }
        return
    }

    if (commentsAtTime.length > 1 && Math.abs(deltaY) >= SWITCH_THRESHOLD) {
        const direction = deltaY > 0 ? 1 : -1
        const newIndex = (currentIndex + direction + commentsAtTime.length) % commentsAtTime.length
        switchTo(newIndex)
    }
}

function createDebouncedCommentOpener() {
    let lastOpenedAt = 0
    const DEBOUNCE_MS = WHEEL_DEBOUNCE_MS

    return (comment) => {
        const now = Date.now()
        if (now - lastOpenedAt < DEBOUNCE_MS) return
        lastOpenedAt = now

        const videoId = getVideoId()
        const commentId = comment?.commentId
        if (videoId && commentId) {
            window.open(`https://www.youtube.com/watch?v=${videoId}&lc=${commentId}`, '_blank')
        }
    }
}

function getOrCreateBar() {
    let bar = document.querySelector('.__youtube-timestamps__bar')
    if (!bar) {
        const container =   document.querySelector('#movie_player .ytp-timed-markers-container') ||
                            document.querySelector('#movie_player .ytp-progress-list')
        bar = document.createElement('div')
        bar.classList.add('__youtube-timestamps__bar')
        container.appendChild(bar)
    }
    return bar
}

function removeBar() {
    const bar = document.querySelector('.__youtube-timestamps__bar')
    bar?.remove()
}

function getTooltip() {
    return document.querySelector('#movie_player .ytp-tooltip')
}

function getTooltipBgWidth() {
    const tooltip = getTooltip()
    if (!tooltip) return PREVIEW_DEFAULT_WIDTH

    const tooltipBg = tooltip.querySelector('.ytp-tooltip-bg')
    if (tooltipBg) {
        const rect = tooltipBg.getBoundingClientRect()
        if (rect?.width > 0) return rect.width

        const computed = window.getComputedStyle(tooltipBg).width
        if (computed?.endsWith('px')) {
            const parsed = parseFloat(computed)
            if (!isNaN(parsed)) return parsed
        }

        if (tooltipBg.style?.width) {
            const parsed = parseFloat(tooltipBg.style.width)
            if (!isNaN(parsed)) return parsed
        }
    }

    const progressBar = document.querySelector('#movie_player .ytp-progress-bar')
    const rect = progressBar?.getBoundingClientRect()
    return rect?.width > 0 ? rect.width * 0.9 : PREVIEW_DEFAULT_WIDTH
}

function applyPreviewWidth(preview, measuredWidth) {
    let w = measuredWidth + PREVIEW_WIDTH_PADDING

    const computed = window.getComputedStyle(preview)
    const minW = parseFloat(computed.minWidth) || 0
    const maxW = parseFloat(computed.maxWidth) || Infinity

    if (minW > 0) w = Math.max(w, minW)
    if (maxW > 0 && isFinite(maxW)) w = Math.min(w, maxW)

    preview.style.width = Math.round(w) + 'px'
}

function showPreview(timeComment, totalComments = 1, currentIndex = 0) {
    const tooltip = getTooltip()
    if (!tooltip) return

    const preview = getOrCreatePreview()
    preview.style.display = ''
    preview.style.bottom = (PREVIEW_MARGIN + PREVIEW_TOOLTIP_MARGIN) + 'px'
    preview.style.transform = 'translateY(0) scale(1)'

    preview.querySelector('.__youtube-timestamps__preview__avatar').src = timeComment.authorAvatar || ''
    preview.querySelector('.__youtube-timestamps__preview__name').textContent = timeComment.authorName || 'Unknown'

    const textNode = preview.querySelector('.__youtube-timestamps__preview__text')
    textNode.innerHTML = ''

    const safeText = timeComment.text?.trim() || '(no comment text)'
    const safeFragment = timeComment.timestamp || ''

    textNode.style.opacity = safeText === '(no comment text)' ? '0.88' : '1'
    textNode.appendChild(highlightTextFragment(safeText, safeFragment))

    const navIndicator = preview.querySelector('.__youtube-timestamps__preview__nav')
    if (totalComments > 1) {
        navIndicator.textContent = `${currentIndex + 1} of ${totalComments} comments`
        navIndicator.style.display = 'block'
    } else {
        navIndicator.style.display = 'none'
    }

    const measured = getTooltipBgWidth()
    applyPreviewWidth(preview, measured)

    preview.style.height = 'auto'
    const contentHeight = preview.scrollHeight
    const idealHeight = Math.max(PREVIEW_MIN_HEIGHT, Math.min(PREVIEW_MAX_HEIGHT, contentHeight))
    preview.style.height = idealHeight + 'px'

    positionPreview(preview, measured)
    setTextMaxHeight(preview, idealHeight)
}

function positionPreview(preview, measured) {
    const halfPreviewWidth = (preview.getBoundingClientRect().width || measured) / 2
    const playerRect = document.querySelector('#movie_player .ytp-progress-bar').getBoundingClientRect()
    const pivot = preview.parentElement.getBoundingClientRect().left
    const minPivot = playerRect.left + halfPreviewWidth
    const maxPivot = playerRect.right - halfPreviewWidth

    let previewLeft
    if (pivot < minPivot) {
        previewLeft = playerRect.left - pivot
    } else if (pivot > maxPivot) {
        previewLeft = -preview.getBoundingClientRect().width + (playerRect.right - pivot)
    } else {
        previewLeft = -halfPreviewWidth
    }

    preview.style.left = (previewLeft - PREVIEW_BORDER_SIZE) + 'px'
}

function setTextMaxHeight(preview, idealHeight) {
    const textNode = preview.querySelector('.__youtube-timestamps__preview__text')
    const headerEl = preview.querySelector('.__youtube-timestamps__preview__author')
    const navIndicator = preview.querySelector('.__youtube-timestamps__preview__nav')

    const headerH = headerEl?.offsetHeight || 0
    const navH = navIndicator?.offsetHeight || 0
    const paddingTotal = PREVIEW_PADDING_TOTAL
    const textMax = Math.max(PREVIEW_TEXT_MIN_HEIGHT, idealHeight - headerH - navH - paddingTotal)

    textNode.style.maxHeight = textMax + 'px'
}

let tooltipBgResizeObserver = null

function ensureTooltipBgObserver() {
    const tooltip = getTooltip()
    if (!tooltip) return

    const tooltipBg = tooltip.querySelector('.ytp-tooltip-bg')
    if (tooltipBgResizeObserver?._observed === tooltipBg) return

    tooltipBgResizeObserver?.disconnect()
    tooltipBgResizeObserver = null

    if (tooltipBg) {
        tooltipBgResizeObserver = new ResizeObserver(() => {
            const preview = document.querySelector('.__youtube-timestamps__preview')
            if (preview?.style.display !== 'none') {
                const measured = getTooltipBgWidth()
                applyPreviewWidth(preview, measured)
                positionPreview(preview, measured)
            }
        })
        tooltipBgResizeObserver._observed = tooltipBg
        tooltipBgResizeObserver.observe(tooltipBg)
    }
}

function handleResize() {
    const preview = document.querySelector('.__youtube-timestamps__preview')
    if (preview?.style.display !== 'none') {
        const measured = getTooltipBgWidth()
        applyPreviewWidth(preview, measured)
    }
    ensureTooltipBgObserver()
}

window.addEventListener('resize', handleResize)
document.addEventListener('fullscreenchange', handleResize)
ensureTooltipBgObserver()

function getOrCreatePreview() {
    const tooltip = getTooltip()
    if (!tooltip) return document.createElement('div')

    let preview = tooltip.querySelector('.__youtube-timestamps__preview')
    if (!preview) {
        preview = createPreviewElement()

        const previewWrapper = document.createElement('div')
        previewWrapper.classList.add('__youtube-timestamps__preview-wrapper')
        previewWrapper.appendChild(preview)
        tooltip.insertAdjacentElement('afterbegin', previewWrapper)
    }
    return preview
}

function createPreviewElement() {
    const preview = document.createElement('div')
    preview.classList.add('__youtube-timestamps__preview')

    const authorElement = document.createElement('div')
    authorElement.classList.add('__youtube-timestamps__preview__author')
    preview.appendChild(authorElement)

    const avatarElement = document.createElement('img')
    avatarElement.classList.add('__youtube-timestamps__preview__avatar')
    authorElement.appendChild(avatarElement)

    const nameElement = document.createElement('span')
    nameElement.classList.add('__youtube-timestamps__preview__name')
    authorElement.appendChild(nameElement)

    const textElement = document.createElement('div')
    textElement.classList.add('__youtube-timestamps__preview__text')
    preview.appendChild(textElement)

    const navElement = document.createElement('div')
    navElement.classList.add('__youtube-timestamps__preview__nav')
    navElement.style.display = 'none'
    preview.appendChild(navElement)

    textElement.addEventListener('wheel', (ev) => {
        if (textElement.scrollHeight > textElement.clientHeight) {
            if (ev.cancelable) ev.preventDefault()
            textElement.scrollBy({ top: ev.deltaY, left: 0, behavior: 'auto' })
        }
    }, { passive: false })

    return preview
}

function highlightTextFragment(text, fragment) {
    const result = document.createDocumentFragment()
    const safeText = String(text)
    const safeFragment = String(fragment)

    if (!safeFragment || safeText.indexOf(safeFragment) === -1) {
        result.appendChild(document.createTextNode(safeText))
        return result
    }

    const parts = safeText.split(safeFragment)
    for (let i = 0; i < parts.length; i++) {
        if (parts[i]) {
            result.appendChild(document.createTextNode(parts[i]))
        }
        if (i < parts.length - 1) {
            const fragmentNode = document.createElement('span')
            fragmentNode.classList.add('__youtube-timestamps__preview__text-stamp')
            fragmentNode.textContent = safeFragment
            result.appendChild(fragmentNode)
        }
    }
    return result
}

function hidePreview() {
    const preview = document.querySelector('.__youtube-timestamps__preview')
    if (preview) {
        preview.style.display = 'none'
    }
}

function parseParams(href) {
    const paramString = href.split('#')[0].split('?')[1]
    const params = {}

    if (paramString) {
        for (const kv of paramString.split('&')) {
            const [key, value] = kv.split('=')
            params[key] = value
        }
    }
    return params
}

function withWheelThrottle(callback) {
    let deltaYAcc = 0
    let afRequested = false

    return (e) => {
        if (e.cancelable) e.preventDefault()
        deltaYAcc += e.deltaY

        if (afRequested) return
        afRequested = true

        window.requestAnimationFrame(() => {
            callback(deltaYAcc)
            deltaYAcc = 0
            afRequested = false
        })
    }
}

function onLocationHrefChange(callback) {
    let currentHref = document.location.href
    const observer = new MutationObserver(() => {
        if (currentHref !== document.location.href) {
            currentHref = document.location.href
            callback()
        }
    })
    observer.observe(document.querySelector("body"), {childList: true, subtree: true})
}
