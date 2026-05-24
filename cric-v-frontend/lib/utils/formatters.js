export function formatDate(dateString) {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-PK', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    })
}

export function formatDateTime(dateString) {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleString('en-PK', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}

export function formatSpeed(kph) {
    if (!kph && kph !== 0) return 'N/A'
    return `${Number(kph).toFixed(1)} km/h`
}

export function formatAngle(degrees) {
    if (!degrees && degrees !== 0) return 'N/A'
    return `${Number(degrees).toFixed(1)}°`
}

export function formatScore(score) {
    if (!score && score !== 0) return 'N/A'
    return `${Math.round(score)}/100`
}

export function formatPercentage(value) {
    if (!value && value !== 0) return 'N/A'
    return `${Number(value).toFixed(1)}%`
}

export function formatShotType(shotType) {
    if (!shotType) return 'Unknown'
    return shotType
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
}

export function getScoreColor(score) {
    if (score >= 80) return 'text-green-500'
    if (score >= 60) return 'text-yellow-500'
    return 'text-red-500'
}

export function getScoreBadgeVariant(score) {
    if (score >= 80) return 'success'
    if (score >= 60) return 'warning'
    return 'destructive'
}

export function getStatusColor(status) {
    switch (status?.toLowerCase()) {
        case 'completed':
            return 'text-green-500'
        case 'processing':
            return 'text-yellow-500'
        case 'failed':
            return 'text-red-500'
        default:
            return 'text-gray-500'
    }
}

export function getStatusBadgeVariant(status) {
    switch (status?.toLowerCase()) {
        case 'completed':
            return 'default'
        case 'processing':
            return 'secondary'
        case 'failed':
            return 'destructive'
        case 'pending':
            return 'secondary'
        case 'uploaded':
            return 'success'
        default:
            return 'outline'
    }
}

export function truncateText(text, maxLength = 50) {
    if (!text) return ''
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
}