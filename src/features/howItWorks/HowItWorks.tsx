interface Props { onClose: () => void }
export function HowItWorks({ onClose }: Props) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="modal" role="dialog" aria-modal="true" aria-labelledby="how-title">
      <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
      <p className="eyebrow">Behind the experience</p><h2 id="how-title">How this works</h2>
      <div className="responsibilities">
        <div><h3>Your product provided</h3><ul><li>Trip dates</li><li>Hotel/location context</li><li>Saved restaurants</li><li>Provenance of saves</li><li>Open meal periods</li><li>Party size</li></ul></div>
        <div><h3>SALT added</h3><ul><li>Venue validation</li><li>Operating status</li><li>Reservation feasibility</li><li>Availability / alternative times</li></ul></div>
      </div>
      <div className="orchestration"><h3>Prototype orchestration</h3><p>Compared relevant dining moments and derived trip-level insights such as “One available time matches your trip.”</p></div>
      <p className="modal-finish">Your product decides how to present the result to the traveller.</p>
    </section>
  </div>
}
