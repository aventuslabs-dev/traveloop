/**
 * 文化体验预订被拒绝的原因。
 *
 * 仅包含错误提示：它们对应 lib/booking.ts 中的 BookingError 联合类型，由
 * `bookingErrorMessage` 解析 —— 这也是它们与客户中心其余文案（见 `account`）
 * 分开存放的原因。
 */
const bookings = {
  /** 对应 lib/booking.ts 的 BookingError；占位符由该类型携带的值填入。 */
  errors: {
    unknownExperience: "找不到该体验项目。",
    noPassChosen: "请选择要使用的通行证。",
    /** `{pass}` 为通行证等级，`{experience}` 为体验名称。 */
    notEntitled: "您的{pass}通行证不包含{experience}。",
    /** `{days}` 为最少提前预订天数。 */
    slotUnavailable: "该时段无法预订。预订须至少提前 {days} 天。",
    /** 同上，另加行程日期限制（订单带有出入境日期时使用）。 */
    slotUnavailableWithinTrip: "该时段无法预订。预订须至少提前 {days} 天，且须在您的行程日期内。",
    participantRange: "参加人数请介于 {min} 至 {max} 人之间。",
    invalidChildren: "请填写有效的儿童人数。",
    packageRequired: "请选择拍摄套餐。",
    /** `{pack}` 为团体套餐名称。 */
    packMinimum: "{pack}至少需要 {min} 人。",
    locationRequired: "请选择地点。",
    locationComingSoon: "{location}尚未开放。",

    /** 通过校验之后、写入时才会出现的错误。 */
    duplicate: "您已预订过此体验项目，请查看下方的预订记录。",
    slotFull: "该时段刚刚订满，请另选日期或时间。",
    saveFailed: "暂时无法保存您的预订，请稍后再试。",
  },
};

export default bookings;
