import React, { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { Bold, Italic, List, Plus, RotateCcw, Underline } from "lucide-react";

const formatLeadDate = (value) => {
  if (!value) return "";
  const ms = Date.parse(String(value).replace(" ", "T"));
  if (!Number.isFinite(ms)) return String(value);
  return new Date(ms).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

const countPhrase = (value, singular, plural) => {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return "";
  return `${num} ${num === 1 ? singular : plural}`;
};

const buildPersonnelSummary = (lead = {}) => {
  const type = String(lead.Armed_Unarmed || "").trim();
  const armed = countPhrase(lead.No_of_Armed_Personnel, "armed officer", "armed officers");
  const unarmed = countPhrase(
    lead.No_of_UnArmed_Personnel,
    "unarmed officer",
    "unarmed officers",
  );
  const parts = [armed, unarmed].filter(Boolean);
  if (parts.length) return parts.join(" and ");
  if (type && type !== "None") return `${type.toLowerCase()} protective personnel as mutually agreed`;
  return "trained protective personnel as mutually agreed";
};

const buildDefaultAgreementHtml = (lead = {}) => {
  const name = lead.Last_Name || lead.Full_Name || "the Client";
  const city = lead.Service_City || "the agreed city";
  const site = lead.Site_Coverage_Location_s || "the agreed site";
  const start =
    formatLeadDate(lead.Service_Start_Date_And_Time) || "the start date";
  const end =
    formatLeadDate(lead.Service_End_Date_And_Time) ||
    "until terminated in writing as per this Agreement";
  const today = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const phone = lead.Mobile || "the number on record";
  const pillar = lead.Service_Pillar || "Protective Services";
  const serviceLine = lead.Service_Line || "Executive Protection";
  const motion = lead.Motion && lead.Motion !== "None" ? lead.Motion : "as agreed";
  const shift =
    lead.Shift_Pattern && lead.Shift_Pattern !== "None"
      ? lead.Shift_Pattern
      : "as mutually agreed";
  const bodyguardType =
    lead.Armed_Unarmed && lead.Armed_Unarmed !== "None"
      ? lead.Armed_Unarmed
      : "as mutually agreed";
  const special = String(lead.Special_Requirements || "").trim() || "None specified";
  const personnel = buildPersonnelSummary(lead);

  return `
    <h1 style="text-align:center;font-size:22px;margin:0 0 6px;">PERMANENT DEPLOYMENT AGREEMENT</h1>
    <p style="text-align:center;margin:0 0 6px;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;">Personal Security &amp; Protective Services</p>
    <p style="text-align:center;margin:0 0 22px;">WENS Force — Premium Personal Security &amp; Chauffeur Services</p>

    <p>This Permanent Deployment Agreement (“<strong>Agreement</strong>”) is made and entered into on <strong>${today}</strong></p>
    <p><strong>BY AND BETWEEN</strong></p>
    <p><strong>WENS Force</strong>, a company engaged in premium personal security and chauffeur services, having its office at 12th Floor, Business Hub, Bandra Kurla Complex, Mumbai – 400051, Maharashtra, India (hereinafter referred to as the “<strong>Service Provider</strong>”, which expression shall, unless repugnant to the context, include its successors and permitted assigns);</p>
    <p style="text-align:center;"><strong>AND</strong></p>
    <p><strong>${name}</strong>, reachable at <strong>${phone}</strong> (hereinafter referred to as the “<strong>Client</strong>”, which expression shall, unless repugnant to the context, include the Client’s authorised representatives, heirs, successors and permitted assigns).</p>
    <p>The Service Provider and the Client are hereinafter collectively referred to as the “<strong>Parties</strong>” and individually as a “<strong>Party</strong>”.</p>

    <p><strong>WHEREAS</strong></p>
    <p>A. The Service Provider is in the business of providing trained close-protection officers, residential and site security, and related protective services.</p>
    <p>B. The Client requires ongoing / permanent deployment of protective personnel at the location and on the terms set out herein.</p>
    <p>C. The Parties have discussed the requirement on a sales call and wish to record the terms of engagement in writing.</p>
    <p>NOW, THEREFORE, in consideration of the mutual covenants contained herein, the Parties agree as follows:</p>

    <h2 style="font-size:16px;margin:22px 0 8px;">1. Definitions</h2>
    <p><strong>1.1</strong> “Personnel” means the officers, bodyguards and other staff deployed by the Service Provider under this Agreement.</p>
    <p><strong>1.2</strong> “Site” means <strong>${site}</strong>, ${city}, and any other location that the Parties mutually agree in writing or by WhatsApp confirmation.</p>
    <p><strong>1.3</strong> “Services” means the permanent protective deployment described in Clause 2.</p>
    <p><strong>1.4</strong> “Booking Amount” means the advance / agreement fee payable through the payment link shared with this Agreement.</p>

    <h2 style="font-size:16px;margin:22px 0 8px;">2. Scope of services</h2>
    <p><strong>2.1</strong> The Service Provider shall deploy <strong>${personnel}</strong> for ongoing / permanent duty at the Site, under service pillar <strong>${pillar}</strong> and service line <strong>${serviceLine}</strong> (motion: <strong>${motion}</strong>).</p>
    <p><strong>2.2</strong> The Services shall include, as applicable to the agreed requirement:</p>
    <p>(a) close protection and escort of the Client and/or nominated principals at the Site and during authorised movements;</p>
    <p>(b) access control, visitor screening and general vigilance at the Site;</p>
    <p>(c) coordination with the Client’s household, office staff or authorised contacts for daily duty instructions;</p>
    <p>(d) incident reporting to the Client’s nominated contact without delay; and</p>
    <p>(e) such other lawful protective duties as are reasonably incidental to the above.</p>
    <p><strong>2.3</strong> Personnel type: <strong>${bodyguardType}</strong>. Shift pattern: <strong>${shift}</strong>.</p>
    <p><strong>2.4</strong> Special instructions recorded at the time of booking: <strong>${special}</strong>.</p>
    <p><strong>2.5</strong> The Service Provider does not provide investigation, recovery, enforcement, or any service that would require the Personnel to act outside applicable law. The Client shall not instruct Personnel to perform any unlawful act, including but not limited to intimidation, illegal detention, trespass, or use of force except as strictly permitted in self-defence under Indian law.</p>

    <h2 style="font-size:16px;margin:22px 0 8px;">3. Term and commencement</h2>
    <p><strong>3.1</strong> This Agreement shall commence on <strong>${start}</strong> and shall continue <strong>${end}</strong>.</p>
    <p><strong>3.2</strong> Deployment is confirmed only after (i) this Agreement is accepted as per Clause 18, and (ii) the Booking Amount is received in cleared funds.</p>
    <p><strong>3.3</strong> If the Client requests an earlier or later start date, the Service Provider shall confirm feasibility in writing / WhatsApp. A change of start date does not by itself vary the commercial terms unless the Parties agree otherwise.</p>

    <h2 style="font-size:16px;margin:22px 0 8px;">4. Nature of engagement</h2>
    <p><strong>4.1</strong> This is a contract for services. Personnel deployed under this Agreement remain employees / associates of the Service Provider and shall not be treated as employees of the Client for any purpose, including labour, tax, provident fund, ESI, gratuity or similar statutes.</p>
    <p><strong>4.2</strong> The Service Provider retains exclusive right of supervision, substitution, discipline and payroll in respect of the Personnel, subject to reasonable operational instructions from the Client regarding duty location, timings and principal to be protected.</p>
    <p><strong>4.3</strong> Nothing in this Agreement creates a partnership, joint venture, or agency, except that Personnel may represent that they are on duty for the Client’s protection while performing the Services.</p>

    <h2 style="font-size:16px;margin:22px 0 8px;">5. Duties of the Service Provider</h2>
    <p><strong>5.1</strong> The Service Provider shall:</p>
    <p>(a) deploy Personnel who are trained for close protection / site duty and, where armed deployment is agreed, duly licensed to carry the relevant weapon under applicable arms laws;</p>
    <p>(b) ensure Personnel attend duty in appropriate attire and with the equipment agreed for the assignment;</p>
    <p>(c) brief Personnel on Site standing orders and the Client’s lawful instructions;</p>
    <p>(d) maintain reasonable continuity of the same officers, subject to leave, illness, training, or operational need; and</p>
    <p>(e) replace any officer who is unavailable, with a suitable substitute, as soon as reasonably practicable.</p>
    <p><strong>5.2</strong> The Service Provider shall make reasonable efforts to match the Client’s stated preferences (appearance, language, experience). Final selection of Personnel remains with the Service Provider, acting reasonably.</p>

    <h2 style="font-size:16px;margin:22px 0 8px;">6. Duties of the Client</h2>
    <p><strong>6.1</strong> The Client shall:</p>
    <p>(a) provide lawful access to the Site, a safe working environment, drinking water, a reasonable rest/meal facility, and toilet access for Personnel on duty;</p>
    <p>(b) nominate one decision-maker / point of contact for daily instructions;</p>
    <p>(c) disclose, before deployment and during the Term, any material risk known to the Client (threats, disputes, court orders, medical conditions of the principal, or presence of firearms at the Site);</p>
    <p>(d) not require Personnel to work beyond the agreed shift except by prior confirmation, in which case overtime or additional charges may apply;</p>
    <p>(e) not retain original identity documents of Personnel, and not withhold wages or belongings of Personnel; and</p>
    <p>(f) ensure that any vehicle, weapon storage, or premises provided for duty is lawful and fit for use.</p>
    <p><strong>6.2</strong> Meals, lodging and outstation travel of Personnel, if required beyond the agreed shift package, shall be arranged or reimbursed by the Client as mutually confirmed.</p>

    <h2 style="font-size:16px;margin:22px 0 8px;">7. Working hours, leave and continuity</h2>
    <p><strong>7.1</strong> Duty shall follow the shift pattern stated above, unless varied by mutual written / WhatsApp confirmation.</p>
    <p><strong>7.2</strong> Personnel are entitled to weekly rest and statutory leave as applicable to the Service Provider’s employment arrangements. The Service Provider shall roster replacements so that Site coverage is not left unattended where 24x7 or continuous duty has been agreed.</p>
    <p><strong>7.3</strong> Temporary absence of an individual officer (illness, emergency, training) shall not constitute a breach if a replacement is provided or if the Client agrees to a short gap.</p>
    <p><strong>7.4</strong> If the Client requests additional officers, extra hours, or a change from unarmed to armed deployment (or vice versa), the Service Provider may accept subject to availability, licensing and revised commercial terms.</p>

    <h2 style="font-size:16px;margin:22px 0 8px;">8. Fees, booking and payment</h2>
    <p><strong>8.1</strong> Commercial terms are as discussed on the call and as reflected in the Booking Amount collected through the payment link shared with this Agreement.</p>
    <p><strong>8.2</strong> The Client shall pay the Booking Amount in advance. Deployment will not start, and this Agreement will not be treated as confirmed, until the Booking Amount is received.</p>
    <p><strong>8.3</strong> Recurring charges (monthly / cycle-wise) shall be paid in advance of each cycle, on or before the due date communicated by the Service Provider. Delayed payment may result in suspension of Services without prejudice to amounts already due.</p>
    <p><strong>8.4</strong> All fees are exclusive of applicable GST and other taxes, which shall be charged extra as per law, unless expressly stated as inclusive.</p>
    <p><strong>8.5</strong> The Booking Amount is adjustable against the first cycle invoices, unless otherwise agreed. It is non-refundable once Personnel have been assigned or have travelled / reported for duty, except where the Service Provider is unable to commence Services for reasons solely attributable to it.</p>
    <p><strong>8.6</strong> Out-of-pocket expenses (tolls, parking, interstate permits, emergency medical aid to Personnel caused at Site, damage to Service Provider equipment caused by the Client or Site conditions) shall be reimbursed by the Client on actuals against intimation.</p>

    <h2 style="font-size:16px;margin:22px 0 8px;">9. Weapons, licensing and compliance</h2>
    <p><strong>9.1</strong> Where armed Personnel are deployed, weapons shall remain the property / licensed responsibility of the Service Provider or the licensed holder, and shall be carried and stored strictly in accordance with the Arms Act, 1959, the Arms Rules, and any state notifications.</p>
    <p><strong>9.2</strong> The Client shall not demand that unlicensed persons carry arms, or that arms be used except in circumstances recognised by law.</p>
    <p><strong>9.3</strong> The Service Provider shall endeavour to comply with PSARA and other applicable private security regulations in respect of its Personnel. The Client shall extend reasonable cooperation for verification, police intimation, or society / building permissions where required.</p>

    <h2 style="font-size:16px;margin:22px 0 8px;">10. Confidentiality and data</h2>
    <p><strong>10.1</strong> Each Party shall keep confidential all personal, residential, itinerary, operational, commercial and family information obtained in connection with the Services, and shall not disclose the same except (a) to Personnel and staff who need to know for performing the Services, (b) as required by law, court, or a competent authority, or (c) with the other Party’s prior consent.</p>
    <p><strong>10.2</strong> The Client authorises the Service Provider to store the Client’s name, phone number, Site details and this Agreement on its CRM and to share the payment link and PDF on WhatsApp for the purpose of this engagement.</p>
    <p><strong>10.3</strong> Photographs, names or identities of Personnel shall not be published by the Client on social media without the Service Provider’s consent.</p>
    <p><strong>10.4</strong> Confidentiality obligations survive termination for a period of three (3) years, and indefinitely in respect of personal data of family members and security SOPs.</p>

    <h2 style="font-size:16px;margin:22px 0 8px;">11. Non-solicitation</h2>
    <p><strong>11.1</strong> During the Term and for twelve (12) months thereafter, the Client shall not, directly or indirectly, employ, engage, or induce any Personnel introduced or deployed by the Service Provider to leave the Service Provider’s employment, whether as staff, consultant, or through another agency, without the Service Provider’s prior written consent.</p>
    <p><strong>11.2</strong> Breach of Clause 11.1 shall entitle the Service Provider to liquidated damages equal to six (6) months of the then-prevailing monthly deployment charges for the relevant officer, which the Parties agree is a genuine pre-estimate of recruitment, training and replacement loss, without prejudice to other remedies.</p>

    <h2 style="font-size:16px;margin:22px 0 8px;">12. Client’s premises, vehicles and risk</h2>
    <p><strong>12.1</strong> The Client remains responsible for the structural safety, fire safety, electrical safety and lawful occupation of the Site.</p>
    <p><strong>12.2</strong> If a Client vehicle is used for escort, the Client shall ensure it is registered, insured and driven only by a licensed driver. The Service Provider is not liable for mechanical failure of Client vehicles.</p>
    <p><strong>12.3</strong> Personal valuables, cash, jewellery and documents at the Site remain the Client’s risk unless loss is caused by proven wilful misconduct of named Personnel, in which case liability is limited as per Clause 14.</p>

    <h2 style="font-size:16px;margin:22px 0 8px;">13. Health, conduct and removal</h2>
    <p><strong>13.1</strong> Personnel shall conduct themselves with courtesy and professionalism. The Client may request replacement of an officer by stating reasons. The Service Provider shall consider the request in good faith and replace the officer where the complaint is reasonable.</p>
    <p><strong>13.2</strong> The Service Provider may withdraw Personnel immediately if the Site is unsafe, if the Client instructs an unlawful act, if payment is overdue, or if Personnel are subjected to abuse, harassment, or non-payment of agreed facilities.</p>
    <p><strong>13.3</strong> Alcohol, narcotics, and unauthorised guests are not permitted in Personnel rest areas. The Client shall not offer intoxicants to Personnel on duty.</p>

    <h2 style="font-size:16px;margin:22px 0 8px;">14. Limitation of liability</h2>
    <p><strong>14.1</strong> Protective services reduce risk; they do not and cannot guarantee that no incident will occur. The Service Provider is not an insurer of the Client, family members, guests, vehicles, or property.</p>
    <p><strong>14.2</strong> To the maximum extent permitted by law, the Service Provider’s aggregate liability under this Agreement, whether in contract, tort or otherwise, shall not exceed the fees actually received from the Client for the one (1) month immediately preceding the event giving rise to the claim.</p>
    <p><strong>14.3</strong> The Service Provider shall not be liable for indirect, special, incidental, or consequential losses, including loss of business, reputation, or anticipated savings, or for incidents arising from the Client’s failure to disclose material risks, from instructions given by the Client, or from force majeure.</p>
    <p><strong>14.4</strong> Nothing in this Clause excludes liability for death or personal injury caused by proven gross negligence or wilful misconduct of the Service Provider, to the extent such exclusion is not permitted under applicable law.</p>

    <h2 style="font-size:16px;margin:22px 0 8px;">15. Indemnity</h2>
    <p>The Client shall indemnify and hold harmless the Service Provider and its Personnel from and against claims, penalties, and costs arising out of (a) unlawful instructions given by the Client, (b) false or incomplete disclosure of threats or Site conditions, (c) injury to Personnel caused by the Client, the principal, guests, or unsafe Site conditions, and (d) third-party claims relating to the Client’s occupation of the Site, except to the extent caused by proven wilful misconduct of the Service Provider.</p>

    <h2 style="font-size:16px;margin:22px 0 8px;">16. Force majeure</h2>
    <p>Neither Party shall be in breach for delay or failure caused by circumstances beyond reasonable control, including natural calamity, epidemic, war, riot, terrorism, strike (other than of that Party’s own staff where alternative arrangements are reasonably possible), government restriction, or failure of public infrastructure. The affected Party shall notify the other promptly and resume performance as soon as practicable. If force majeure continues for more than thirty (30) days, either Party may terminate this Agreement by written notice, without prejudice to fees already accrued.</p>

    <h2 style="font-size:16px;margin:22px 0 8px;">17. Termination</h2>
    <p><strong>17.1</strong> Either Party may terminate this Agreement by giving fifteen (15) days’ prior written notice (email or WhatsApp to the number on record is sufficient), unless a longer notice is mutually agreed for a specific assignment.</p>
    <p><strong>17.2</strong> Either Party may terminate immediately if the other Party (a) commits a material breach and fails to cure it within seven (7) days of notice, (b) becomes insolvent, or (c) instructs or engages in unlawful activity in connection with the Services.</p>
    <p><strong>17.3</strong> Upon termination, the Client shall pay all outstanding dues up to the effective termination date, including notice-period charges if the Client ends the engagement without the notice required under Clause 17.1.</p>
    <p><strong>17.4</strong> On the last day of duty, the Client shall return any Service Provider equipment, identity cards, and weapons storage keys, and shall permit an orderly handover.</p>

    <h2 style="font-size:16px;margin:22px 0 8px;">18. Acceptance</h2>
    <p><strong>18.1</strong> This Agreement may be accepted by any of the following, each of which is valid and binding: (a) payment of the Booking Amount through the link shared with this Agreement; (b) written or WhatsApp confirmation by the Client; or (c) allowing Personnel to commence duty after receipt of this document.</p>
    <p><strong>18.2</strong> Physical signature is not required for validity. The PDF shared on WhatsApp, together with payment records, constitutes the executed Agreement.</p>
    <p><strong>18.3</strong> If any printed or uploaded version conflicts with a later written variation confirmed by both Parties on WhatsApp or email, the later variation prevails in respect of that conflict.</p>

    <h2 style="font-size:16px;margin:22px 0 8px;">19. Notices</h2>
    <p>Notices under this Agreement may be sent to the Client on <strong>${phone}</strong> and to the Service Provider at the Mumbai office address stated above or such other WhatsApp / email as notified. A notice is deemed received when sent on WhatsApp or email, unless a delivery-failure report is received.</p>

    <h2 style="font-size:16px;margin:22px 0 8px;">20. Governing law and dispute resolution</h2>
    <p><strong>20.1</strong> This Agreement shall be governed by the laws of India.</p>
    <p><strong>20.2</strong> The Parties shall first attempt to resolve any dispute amicably within fifteen (15) days of written notice of the dispute.</p>
    <p><strong>20.3</strong> Subject to Clause 20.2, courts at Mumbai, Maharashtra shall have exclusive jurisdiction.</p>

    <h2 style="font-size:16px;margin:22px 0 8px;">21. Miscellaneous</h2>
    <p><strong>21.1 Entire agreement.</strong> This Agreement, together with the payment link, WhatsApp confirmations, and any annexure of duty roster, constitutes the entire understanding and supersedes prior oral discussions, except that commercial figures collected through the official payment link form part of this Agreement.</p>
    <p><strong>21.2 Amendment.</strong> No amendment is valid unless confirmed in writing or WhatsApp by both Parties.</p>
    <p><strong>21.3 Severability.</strong> If any provision is held invalid, the remainder shall continue in force.</p>
    <p><strong>21.4 Assignment.</strong> The Client shall not assign this Agreement without the Service Provider’s consent. The Service Provider may assign or subcontract performance to its group entities or trained associates, remaining responsible for the Services.</p>
    <p><strong>21.5 Waiver.</strong> Failure to enforce a provision is not a waiver of the right to enforce it later.</p>
    <p><strong>21.6 Counterparts.</strong> This Agreement may be generated electronically and shared as a PDF. Electronic records are admissible as per the Information Technology Act, 2000.</p>

    <p style="margin-top:22px;">IN WITNESS WHEREOF, the Parties have accepted this Agreement on the date first written above.</p>
    <p><strong>For the Client:</strong> ${name}</p>
    <p><strong>For the Service Provider:</strong> WENS Force, Authorised Signatory</p>
  `.trim();
};

const buildBlankAgreementHtml = (lead = {}) => {
  const name = lead.Last_Name || lead.Full_Name || "";
  return `
    <h1 style="text-align:center;font-size:22px;margin:0 0 16px;">New Agreement</h1>
    <p>Date:</p>
    <p>Client: ${name}</p>
    <p>City / Site:</p>
    <p></p>
    <p>1. Scope of services</p>
    <p></p>
    <p>2. Commercial terms</p>
    <p></p>
    <p>3. Acceptance</p>
    <p></p>
  `.trim();
};

const LOGO_URL = `${import.meta.env.BASE_URL}brand/wens-logo.png`;
const SIGNATURE_URL = `${import.meta.env.BASE_URL}brand/wens-signature.png`;

const ToolbarButton = ({ title, onClick, children, className = "" }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    className={`btn-secondary inline-flex h-9 items-center justify-center ${className}`}
  >
    {children}
  </button>
);

const AgreementTextEditor = forwardRef(
  ({ lead = {}, hidden = false, onResetToStandard = () => {} }, ref) => {
    const editorRef = useRef(null);
    const readyRef = useRef(false);

    const setHtml = (html) => {
      if (!editorRef.current) return;
      editorRef.current.innerHTML = html;
    };

    const loadStandard = () => {
      setHtml(buildDefaultAgreementHtml(lead));
      readyRef.current = true;
    };

    const loadBlank = () => {
      setHtml(buildBlankAgreementHtml(lead));
      readyRef.current = true;
      editorRef.current?.focus();
    };

    useEffect(() => {
      if (readyRef.current || !editorRef.current) return;
      setHtml(buildDefaultAgreementHtml(lead));
      readyRef.current = true;
    }, [lead]);

    useImperativeHandle(
      ref,
      () => ({
        loadStandard,
        loadBlank,
        getHtml: () => editorRef.current?.innerHTML || "",
        getText: () => editorRef.current?.innerText || "",
      }),
      [lead],
    );

    const runCommand = (command, value = null) => {
      editorRef.current?.focus();
      document.execCommand(command, false, value);
    };

    return (
      <div className={hidden ? "hidden" : "block"}>
        <div className="overflow-hidden rounded-2xl border border-border bg-muted/20">
          <div className="flex flex-wrap items-center gap-2 border-b border-border bg-card px-3 py-2">
            <ToolbarButton title="Bold" onClick={() => runCommand("bold")} className="w-9 p-0">
              <Bold size={15} />
            </ToolbarButton>
            <ToolbarButton title="Italic" onClick={() => runCommand("italic")} className="w-9 p-0">
              <Italic size={15} />
            </ToolbarButton>
            <ToolbarButton
              title="Underline"
              onClick={() => runCommand("underline")}
              className="w-9 p-0"
            >
              <Underline size={15} />
            </ToolbarButton>
            <ToolbarButton
              title="List"
              onClick={() => runCommand("insertUnorderedList")}
              className="w-9 p-0"
            >
              <List size={15} />
            </ToolbarButton>
            <ToolbarButton
              title="Add line"
              onClick={() => runCommand("insertHTML", "<p><br></p>")}
              className="min-h-9 gap-1.5 px-3 text-xs"
            >
              <Plus size={14} />
              Add line
            </ToolbarButton>
            <ToolbarButton
              title="Reset to standard"
              onClick={() => {
                loadStandard();
                onResetToStandard();
              }}
              className="ml-auto min-h-9 gap-1.5 px-3 text-xs"
            >
              <RotateCcw size={14} />
              Reset to standard
            </ToolbarButton>
          </div>

          <div className="bg-[#e8e8e8] px-3 py-6 md:px-8 md:py-8">
            <div className="mx-auto max-w-[720px] overflow-hidden bg-white shadow-md">
              <header className="flex items-center gap-3 border-b border-neutral-200 px-10 py-5">
                <img
                  src={LOGO_URL}
                  alt="WENS Force"
                  className="h-14 w-14 object-contain"
                />
                <div>
                  <p className="text-base font-semibold tracking-tight text-neutral-900">
                    WENS Force
                  </p>
                  <p className="text-xs text-neutral-500">
                    Premium Personal Security &amp; Chauffeur Services
                  </p>
                </div>
              </header>

              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                className="min-h-[720px] px-10 py-8 text-[15px] leading-7 text-neutral-800 outline-none"
                style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
              />

              <footer className="flex justify-end border-t border-neutral-200 px-10 py-6">
                <div className="w-48 text-center">
                  <img
                    src={SIGNATURE_URL}
                    alt="Authorized Signatory"
                    className="mx-auto h-16 w-full object-contain object-bottom"
                  />
                  <p className="mt-1 text-[11px] font-medium uppercase tracking-widest text-neutral-500">
                    Authorized Signatory
                  </p>
                  <p className="text-xs font-semibold text-neutral-800">
                    WENS Force
                  </p>
                </div>
              </footer>
            </div>
          </div>
        </div>
      </div>
    );
  },
);

AgreementTextEditor.displayName = "AgreementTextEditor";

export default AgreementTextEditor;
