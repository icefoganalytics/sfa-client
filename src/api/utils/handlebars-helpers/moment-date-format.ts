import moment from 'moment'

export default function momentDateFormat (date: Date, format: string) {
    return moment.utc(date).format(format)
}
