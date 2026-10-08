import React, { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { Bold, Italic, List, Plus, RotateCcw, Underline } from "lucide-react";

/**
 * The standard draft ships with fill-in placeholders instead of CRM values.
 * The agent replaces them in the editor before the agreement is sent.
 */
const buildDefaultAgreementHtml = () => {
  // ---- Placeholders (only the values that change per client) ----
  const today = "[AGREEMENT DATE]";
  const name = "[CLIENT NAME]";
  const clientAddress = "[CLIENT REGISTERED ADDRESS]";
  const city = "[SERVICE CITY]";
  const personnel = "[NUMBER AND TYPE OF PERSONNEL]";
  const duration = "[CONTRACT DURATION]";
  const start = "[SERVICE START DATE]";
  const end = "[SERVICE END DATE]";
  const proposalDate = "[PROPOSAL DATE]";

  return `
    <p style="text-align:right;font-size:11px;line-height:1.45;margin:0 0 18px;">
      <strong>REGISTERED:</strong><br/>
      <strong>Integrated HQ of RS-WEST</strong><br/>
      <strong>Ex-Army / Commando Recruitment Unit</strong><br/>
      <strong>Additional Human Resources Dept. Fort HQ</strong><br/>
      <strong>Mumbai 400001 – INDIA</strong><br/>
      <strong>Tele.: +91 7304607954</strong><br/>
      <strong>Email: hr@wensforce.com</strong>
    </p>

    <h1 style="text-align:center;font-size:18px;margin:0 0 22px;text-decoration:underline;">AGREEMENT FOR PROVIDING MANPOWER</h1>

    <p>THIS AGREEMENT is made at Mumbai on this ${today};</p>
    <p style="text-align:center;">Between</p>
    <p><strong>WENS FORCE</strong>, represented by its Director and General Manager of <strong>Office:</strong> 89/2, Empire Building, Dr. D. N. Road, Opp. CSMT Station, Fort, Mumbai 400001 “WENS FORCE”, (which expression unless repugnant to the context or meaning thereof mean and include its successor or successors, administrators and assigns) of the ONE PART;</p>
    <p style="text-align:center;">AND</p>
    <p><strong>${name},</strong> Representation of its Directors / Owner/Partner in Govt agency / Ministry of Corporate Affair and or its assign, having its registered <strong>Address</strong>: ${clientAddress}<br/>
    Here in after for brevity referred to as “THE CLIENT”<br/>
    (Which expression unless repugnant to the context or meaning thereof shall mean and include its successor or successors, administrators and assigns) of the OTHER PART;</p>

    <p><strong>WHEREAS: -</strong></p>
    <p>(a) <strong>WENS Force</strong> Signing contract to provide Manpower for the position of Assistant in Security Department of Client.<br/>
    (b) The Client intends to engage <strong>WENS Force</strong> for providing Assistant at Security Department at Its location(s) situated at ${city}, INDIA.</p>
    <p>- The Client appointed its representative(s) to coordinate with the WENS Force for conducting their security related care taking while on duty shift.<br/>
    Accordingly, WENS Force has agreed to deploy ${personnel} number of Personnel on a contractual basis for a period of <strong>${duration}</strong> commencing from <strong>${start}</strong> and expiring on <strong>${end}</strong> as per the aforesaid Service the said period may be further extended by the parties for such period and terms as may be mutually agreed between WENS Force and the Client. A chart of the Personnel to be deployed indicating the number, designation and description of the personnel are annexed as <strong>Annexure “I”</strong> hereto.<br/>
    - In consideration of the deployment of the aforesaid Personnel by WENS Force, the Client has agreed to avail the Security Services of WENS FORCE at the said location(s) and where upon a financial proposal in the sum as per <strong>Annexure – I</strong> per month (which is exclusive of Tax or such other on time required to pay upfront to the agency to arrangement related cost.</p>
    <p>(Applicable rate) has been sent to the client on <strong>${proposalDate}</strong>. A Statement indicating the said charges is annexed as Annexure “II” hereto. The aforesaid financial proposal is read, understood and accepted by the Client. All the Taxes as applicable from time to time will be charged on the said amount and shall accordingly be payable by the Client.</p>
    <p style="margin-left:24px;">- The said Services to be provided by WENS Force are to be provided in accordance with the provisions of the said Act and Rules there under as may be amended from time to time and which provisions shall remain binding on the parties hereto. The provisions of the said Act and the Rules thereunder are read, understood and accepted by the Client.</p>
    <p style="margin-left:24px;">- The parties hereto have pursuant to the Agreement arrived at between them entered into this contract upon the terms and conditions mentioned hereinafter.</p>

    <p><strong>NOW THIS AGREEMENT WITNESSETH as under: -</strong></p>

    <p>1. WENS FORCE agrees to deploy ${personnel} number of Personnel on a contractual basis for the Client.</p>

    <p>2. Proposal submitted by WENS FORCE to the Client and accepted by the Client. A chart of Deployment of the said Personnel indicating the number and description of the personnel is <strong>Annexure “I”</strong> hereto. The said financial proposal submitted and accepted by the Client is <strong>Annexure “II”</strong> hereto.<br/>
    (a) Deficiency in manpower at duty points;<br/>
    (b) By reason of under assessment when the need-based strength was determined;<br/>
    (c) Due to commissioning the new manpower;<br/>
    (g) Needs arising from re-calculation of the manpower requirements for various duties (due to revision of scales for manpower).<br/>
    In such an event, the deployment of Personnel and the financial obligations shall stand revised accordingly.</p>

    <p>1. The initial period of this contract will be effect from <strong>${start}</strong> and expiring on <strong>${end}</strong>, <strong>Salary</strong> will on <strong>01<sup>st</sup> Day of Every month</strong> after adjustment of first month salary on prorate basis, which contract may be further extended by the parties for such period(s) as may be mutually agreed between WENS Force and the Client.</p>

    <p>2. The rates offered by WENS FORCE and accepted by the Client are given at <strong>Annexure “I”</strong> hereto. The Rates of Security Charges would also be made applicable to you; Rates will lock for 1 year and if raise by Board of Directors of WENS FORCE. However, in addition thereto, all applicable taxes and payable to the Government and Statutory Authorities shall be borne and paid by the Client.</p>

    <p>3. Further, the rates will be governed by various laws then applicable.</p>

    <p>4. The deployment of Personnel shall be from the Personnel of WENS FORCE</p>

    <p>5. (a) The Client shall make and provide suitable arrangements for guard cabins OR accommodation and standard diet/food applicable in general required as per interest of Personnel which include potable water wherever required, along with necessary furniture like table(s), chair(s), fan(s), light(s), electricity and common washroom/toilet etc. to enable the personnel to perform and discharge their duties efficiently. Such arrangements shall be made at the sole behest of the client only for which no reimbursement shall be made by WENS FORCE to the client.</p>
    <p>(b) Transportation to Personnel shall be provided by the client.<br/>
    (c) Due to any personal reason, if client do not wish to continue provided Personnel, WENS Force shall give the replacement, however no provision for refund in any case.</p>

    <p>6. (a) WENS FORCE shall ensure that its Personnel so deployed shall perform their duties with due care and attention.<br/>
    (b) The Client shall authorize and shall vest the Personnel and officers with the requisite powers and authority for the effective discharge of their duties at the said location(s) of deployment.<br/>
    (c) The issues like discipline, conduct etc. is the sole jurisdiction of WENS FORCE &amp; WENS FORCE shall take immediate and suitable steps to ensure that lapses in discharge of security functions, if any, when brought to its notice, are immediately corrected / removed.</p>

    <p>7. WENS FORCE will ensure that the personnel deployed by WENS FORCE under this agreement will perform its duty to safeguard the property and security of the client diligently with utmost diligence and care.</p>

    <p>8. The personnel deployed by WENS FORCE being deemed to be Special security officer shall be bound to perform duties as special security officer.</p>

    <p>09. Security threats are to be taken care by WENS FORCE AND State Government personnel are Security Guards who are providing the basic security. While dealing with threats emanating terrorist activity, anti-social</p>
    <p>9 Elements and underworld criminals and other matters connected there with, the clients have to take immediate assistance of Local Police, Q.R.T., or A.T.S. team.</p>

    <p>10. WENS Force agrees that it shall be responsible to ensure that the Personnel deployed by it shall be suitably attired in the uniform provided to them and that they shall abide by all the conventional rules of discipline and good behavior.</p>

    <p>11. In the event that any Personnel are involved in any act which is detrimental to the interest of the Client, the Client reserves the right to require WENS FORCE to withdraw such Personnel from the said location(s) with immediate effect with reasonable advance notice to WENS FORCE in that regard. In case of any emergency, WENS FORCE shall act expeditiously.</p>

    <p>12. WENS FORCE shall make its best efforts to ensure that its Personnel shall comply with all safety rules and regulations in accordance with the laws applicable to them.</p>

    <p><strong>13. LOSSES DUE TO THEFT/PILFERAGE/ DAMAGE:</strong><br/>
    In case of any loss due to theft, pilferage, or damage to the Client's property, an FIR shall be lodged by the Client or the person who first notices such incident at the earliest opportunity. A joint enquiry shall be conducted by authorized representatives of the Client and WENS FORCE. If the enquiry concludes that the loss was caused due to the negligence of Personnel deployed by WENS FORCE, the liability of WENS FORCE shall be limited to a token fine not exceeding 15 days' salary of the Personnel found responsible.</p>
    <p>Further, any insurance coverage available in respect of the lost, damaged, or stolen assets/property Shall be invoked and considered first while assessing the loss. WENS FORCE shall not be liable for any indirect, consequential, uninsured, or excess loss beyond the aforesaid limit.<br/>
    Appropriate disciplinary action shall be taken against the Personnel found responsible.</p>

    <p>15. Other than as provided in this Agreement, WENS FORCE shall at all times indemnify and keep indemnified the Client against any claims or suits in respect of any loss or damage or compensation payable in consequences of any accident or injury sustained or suffered by the Personnel deployed by WENS FORCE.</p>

    <p>16. WENS FORCE shall organize checks to ensure that the Personnel posted at the said location(s) shall regularly attend, remain present, remain alert and perform their duties properly. However, the Client may exercise administrative control over the Personnel deployed by WENS FORCE for the purpose of ensuring movement of men and material as per the Client’s standing orders, attendance and reporting through their authorized personnel.</p>

    <p>17. The Client shall have the right to carry out a surprise inspection at any time without notice to WENS FORCE.</p>

    <p>18. The Personnel deployed by WENS FORCE shall at all times employees of WENS FORCE, who (WENS FORCE) shall be responsible to meet all their statutory obligations of Government/Statutory bodies in respect of the Personnel deployed by it.</p>

    <p>19. PROCEDURE FOR PAYMENT OF BILLS: -</p>
    <p>(a) One Month salary Shall be as security deposit and will adjust in full and final settlement.</p>
    <p>(a1) Apart from security deposit, advance payment is applicable.</p>
    <p>(a2) Payments shall be made by the Client to WENS FORCE on a Monthly Advance basis.</p>
    <p>(b) In order to get reimbursement of the expenditure on the Force Recovery Bill, a consolidated bill in duplicate shall be raised by WENS FORCE upon the Client for each month during the FIRST week of every current month. Upon receipt receiving of such Bill, the Client shall remit payment thereof on or before the 2nd day of each following month by Cheque/DD/PO/RTGS/Electronic Transfer to WENS FORCE</p>
    <p>(c) If any Personnel does not report for duty and no replacement is provided for the duty point; then in that event a prorate deduction will be made in the bill. Duties for extra hours of Personnel shall be charged at double than the normal rate fixed by WENS FORCE as per the provisions of Section 14 of The Minimum Wages Act, 1948 &amp; Rule 25 of Minimum Wages (Central) Rules, 1950.<br/>
    The said payment of over time shall be borne by the client. Also, duties by Personnel on National Holidays i.e. on 1st May, 15th August, 26th January and 2nd October shall be charged at double than the normal rate fixed by WENS FORCE.</p>
    <p>(d) The client shall give to the Personnel at least one day in a week as a Holiday as per the provisions of The Bombay Shops &amp; Establishments Act, 1948 &amp; Factories Act, 1948 which provides one weekly off is allowed after 6 days of working which is a paid Holiday. The said payment of weekly off shall be borne by the client.</p>
    <p>(e) It is also agreed that if the Client requires WENS FORCE to provide additional Personnel due to exigencies and if the WENS FORCE is in a position to do so, the same shall be on the same terms and conditions provided herein and the Client shall reimburse the payment of such additional Personnel deployed by WENS Force on a pro-rata basis.</p>
    <p>(f) In case there is a delay on part of the Client in releasing the payment in excess of a month from the due date of payment, interest at the rate of 12% per annum shall be payable by the Client from the due date of payment till payment.</p>
    <p>(g) WENS FORCE reserves its right to transfer the Personnel deployed at the client’s premises. However, clients Organization would be consulted and their concerns would be addressed to the extent possible.</p>
    <p>(h) In the event of a representation made by a client regarding suitability &amp; non-suitability of a particular Personnel, the matter will be put to the WENS FORCE’s M.D &amp; quick decision will be taken on the same.</p>

    <p><strong>20. ADVANCE SECURITY DEPOSIT:</strong><br/>
    The Client shall deposit with WENS FORCE an amount as per mentioned in Annexure – 1 Month advance security deposit, shall be adjusted in full and final settlement while separation or maturing the contract as per Annexure - I, which is equivalent to one month of average billing with tax for deployment by WENS FORCE of Personnel as interest free<br/>
    <strong>PAYMENT IN ADVANCE FOR THREE MONTHS.</strong></p>

    <p>21. All Government taxes whatever on the billed amount at the rates prevailing from time to time shall be borne and paid by the Client and which shall be in addition to the liability to pay the billed amount.</p>

    <p>22. WENS FORCE alone shall be responsible to settle the legal dues of its Personnel on termination of their services by WENS FORCE and no liability will rest upon the Client.</p>

    <p>23. (a) WENS FORCE agrees that it shall maintain all such records and registers that are required to be maintained as per the law, in respect of its personnel deployed under this Agreement.</p>
    <p>(b) An attendance register of Personnel shall be kept by WENS FORCE as well as by the Client and between the last 5 days of every month, the same shall be reconciled by the officers of the client with the officers of WENS FORCE and by the end of each month, the same will be reconciled to avoid any differences or variations in the invoices to be raised by WENS FORCE</p>

    <p>24. In cases of breach of this Agreement, this Agreement may be terminated by either party at any time by giving 1 (one) months prior written Notice.</p>

    <p><strong>Penalty</strong>: Employee / Client who violates the law or any of the provisions of these agreements or the rules setup by WENS Force and could face legal action and shall be responsible for all damages, liability, and fines as mentioned in the Fee Policy. Furthermore,</p>

    <p><strong>Anti-Poaching Policy:</strong> WENS Force has a Zero (0) Poaching Policy If poaching is suspected or proven, we will present and will realize / cover the loss(es) through security /assurance given by employee in form of INR 1,00,000. (Rs. One Lakh Only) bank cheque kept with the company i.e. WENS Force | Wen’s bridge International Services Private Limited. Employee further indemnified here that, He will inform to the organization if client or its related agent or any person offer him to work with them directly, this is not limited to this, company can initiate a legal action in extent to recover loss(es) from employee or client in case other part poach employee, its affiliate, its contractor, it’s agent, Attorney, Assigns, and Successor while being continuous in contract or break the contract, However, Customer in exception case can approach restricted ex-employee or agents only after six months (06) of discontinuing the agreement.</p>

    <p><strong>25. CONFIDENTIALITY:</strong></p>
    <p>Client requested to strictly refrain to ask compensation or other benefits given by WENS Force to its deployed personnel at client location. No party shall disclose any information to any third party concerning the matter of this Agreement. Any proprietary information viz pipeline layout, production/storage, to be contained in reports or disclosed by one party to other party and all the information shall be kept strictly confidential by the receiving party, and shall not be disclosed to any third party without prior written consent of the original disclosing party.</p>

    <p><strong>26. GENERALLY</strong><br/>
    (a) No delay in enforcing any right of a Party under this Agreement shall constitute a waiver of such rights, or an acquiescence in the event giving rise to such rights and any such rights may be exercised at any time and from time to time as the Party to whom such rights belong deems fit and proper.</p>
    <p>(b) It is understood between the parties that there does not exist any employer – employee or master – servant relationship between the Client and the Personnel deployed by WENS FORCE under the present Agreement and the said Personnel shall always remain the Employees of WENS FORCE and that persons deployed by WENS FORCE shall have no claim of any nature whatsoever against the Client either for regularization of their services with the Client or otherwise howsoever, they being only the employee of WENS FORCE, Furthermore, CLIENT is obliged to maintain the dignity of PERSONNEL and shall not involve any duty other that scope of Assistant in Security Department to take care security related task of client.<br/>
    (c) This Agreement shall (a) supersede and take the place of all prior written and oral understandings and agreements, if any, between the Parties hereto with respect to the subject matter hereof and (b) shall not be modified, altered or amended in any manner whatsoever except by an agreement in writing signed and executed by both the parties hereto in which this Agreement is expressly referred to.<br/>
    (d) The terms and provisions of this Agreement are severable and in the event that any term or condition hereof is found to be unenforceable by a court of law or otherwise, then all other provisions of this Agreement not found unenforceable shall remain in full force and effect.<br/>
    (e) In the present agreement, WENS FORCE and the Client are collectively referred to as “the Parties” and individually as “the Party”.</p>

    <p><strong>27. NOTICE PERIOD:</strong></p>
    <p>Notice of 01 (one) months is required to send if any both parties discontinue the contract. If notice has not been served prior then paid notice compensation will be applicable to client.</p>

    <p><strong>28. DISPUTES AND APPLICABLE LAWS:</strong></p>
    <p>(a) This Agreement shall be governed by the existing laws of the land.<br/>
    (b) In case of any disputes and/or differences, only parties hereto will be entitled to mutually settle the same. No third Party will be involved in the same.<br/>
    (c) This Contract/Agreement is subject to jurisdiction of Mumbai Courts alone. Any dispute arising out of or in connection with this Agreement shall be referred to arbitration under the Arbitration and Conciliation Act, 1996. The arbitration may be conducted in the State of either Party as mutually agreed. However, the seat of arbitration shall be Mumbai, Maharashtra, and the courts at Mumbai shall have exclusive jurisdiction. The arbitral award shall be final and binding on both Parties.</p>

    <p><strong>29. REPLACEMENT:</strong><br/>
    It is agreed that upon submission of candidate profiles, the Client shall shortlist and accept the Profile out of three (3) to five (5) profiles. Based on the Client’s selection, the Company shall deploy one (1) candidate.<br/>
    Transportation charges as per Actual Will be Applicable if Replacement Required.</p>
    <p>In the event that the deployed candidate is rejected by the Client within the agreed evaluation period, the Company shall provide a replacement candidate. If the replacement candidate is also rejected, and the Agreement shall be considered as non-refundable or The Client may raise a debit note only with valid documentary evidence and written justification. WENS FORCE reserves the right to review, reject, or dispute any debit note that is not supported by sufficient proof. No debit note shall be deducted or adjusted from any invoice without the prior written consent of WENS FORCE. In the absence of any written complaint within 7 days of service delivery, the services shall be deemed satisfactory, accepted, and duly completed by the Client.</p>

    <p><strong>29. Security Service Liability &amp; Insurance Policy – Important Terms</strong></p>
    <p>If a theft occurs, the loss will not be directly covered by the Agency. It will be bought from the insurance company after investigation and verify the claim by reviewing the policy coverage. As per the coverage policy, Wens Force personnel perform private security duties legally with the help of local police and the Responsible department release and solely based on Their Investigation and Their Policies.<br/>
    No other such claims will be entertained by us without proper verification.</p>

    <p><strong>Important Note:<br/>
    If there are certain valuable items or personal properties that are a matter of concern, we require a first declaration of such assets on the property. If high-value assets on the premises are claimed to be lost or stolen without providing concrete evidence, such claims will not be entertained.</strong></p>
    <p><strong>If these assets were not disclosed earlier or at the time of contract, such claims will also not be considered.</strong></p>
    <p><strong>Work Place Insurance Policy Premium of ₹1 Lac Additionally applicable per Security officer.<br/>
    Per Annum, (if the losses verified by the competent authority or investigator). Only the item(s) has been earlier disclosed via official inventory book along with security inward or outward stamp. Which is also be covered by third party insurance or TPA agency agencies investigations confirmed and borne by the TPA or Insurance companies itself, to get this type of cover the client has to separately request to initiate the workplace inventory insurance plan duly borne by the client itself. WENS Force International Private Limited will no entertain any direct claim from any person, client or designated agent to us. It will be solely treated and covered by TPA or Insurance companies if insurance is done prior. However, if client did not request for the workplace or similar inventory insurance plan from WENS Force, We won’t entertain any direct claim thereof.</strong></p>

    <p><strong>30.Client Terms &amp; Conditions –</strong></p>
    <p>1. Confidentiality (non-negotiable)<br/>
    The Service Provider and its personnel must maintain strict confidentiality regarding all sensitive information, including business operations, security arrangements, and proprietary data. Personnel shall not record, photograph, or disclose any information and must execute individual undertakings if requested. This obligation survives termination indefinitely. Any breach entitles the Client to immediate termination and recovery of damages.<br/>
    2. Jurisdiction (non-negotiable)<br/>
    This Agreement shall be governed by the laws of India, with exclusive jurisdiction granted to the courts in Mumbai.<br/>
    3. Notice Period (Revised)<br/>
    - Standard Termination: 30 days’ prior written notice by either party.<br/>
    - Breach/Negligence: 15 days’ written notice, or immediate effect in cases of serious misconduct or security threats.<br/>
    - Settlement: All dues shall be settled within 15 days of termination, subject to reconciliation.</p>
    <p>4. Indemnity<br/>
    The Service Provider shall indemnify the Client against theft, negligence, injury claims, and statutory non-compliance. In cases of proven gross negligence or wilful misconduct, the Service Provider shall be liable for actual losses without a monetary cap, replacing the previous 15-day salary limitation.</p>
    <p>5. Non-Solicitation<br/>
    The Client shall not directly employ personnel during the contract and for one month thereafter without consent, unless the individual resigns independently without solicitation.</p>
    <p>6. Deployment &amp; Compliance<br/>
    - No personnel replacements may be made without prior written approval.<br/>
    - The Service Provider must conduct and provide proof of police verification and background checks for all personnel prior to deployment.</p>

    <p><strong>31.Commercial Terms, Recruitment Process &amp; PSO Service Terms –</strong></p>

    <p><strong>PART A – COMMERCIAL TERMS: SECURITY PERSONNEL DEPLOYMENT</strong><br/>
    <strong>A.1 Three (3) Month Contract</strong><br/>
    1. Service Charge: <strong>51% of the applicable salary</strong>.<br/>
    2. Applicable GST: <strong>18% GST shall be charged on the applicable service/markup component</strong>.<br/>
    3. Payment Terms: <strong>Payment shall be made in advance to the agency</strong> as per the agreed commercial arrangement.<br/>
    <strong>A.2 Six (6) Month Contract</strong><br/>
    1. Service Fee: <strong>34% of the applicable salary</strong>.<br/>
    2. Applicable GST: <strong>18% GST shall be applicable on the service fee</strong>.<br/>
    3. Commercial Terms: The final commercial terms shall be finalized as per the Client's requirement and mutual agreement.<br/>
    <strong>A.3 Twelve (12) Month Contract</strong><br/>
    1. Service Charge: <strong>17% of the applicable salary</strong>.<br/>
    2. Applicable GST: <strong>18% GST shall be applicable</strong>.<br/>
    <strong>A.4 Individual Hiring / Long-Term Engagement</strong><br/>
    1. For a <strong>24-month engagement</strong>, a discounted commercial structure may be offered, subject to management approval.<br/>
    2. For a <strong>12-month engagement</strong>, the applicable agreed amount/fee shall be collected in advance as per the commercial agreement.<br/>
    3. <strong>Ticket/travel charges</strong>, wherever applicable, shall be borne directly by the Client.<br/>
    <strong>A.5 Permanent Hiring / Margin Structure</strong><br/>
    1. The margin for permanent hiring shall be finalized based on the profile, salary level, hiring requirement and commercial discussion with the Client.<br/>
    2. Where the Client is willing to offer a higher commercial value, the Company may revise the service margin accordingly, subject to management approval.<br/>
    3. The detailed <strong>margin-flow/commission structure shall be shared separately by the Management</strong>.</p>

    <p><strong>PART B – MONTHLY PAYMENT TERMS: SECURITY PERSONNEL</strong><br/>
    1. For deployed security personnel, the applicable monthly service charges shall be payable <strong>in advance</strong>.<br/>
    2. The monthly advance payment shall be made between the <strong>1st and 7th day of every month</strong>.<br/>
    3. The applicable service fee, salary component and other agreed charges shall be payable as per the commercial terms finalized between the Parties.<br/>
    4. Applicable GST and other agreed charges shall be included in the invoice wherever applicable.<br/>
    5. Any service or requirement outside the agreed scope shall be separately discussed and commercially approved.</p>

    <p><strong>PART C – CLIENT INTERVIEW &amp; CANDIDATE SELECTION PROCESS</strong><br/>
    <strong>C.1 Interview Process</strong><br/>
    1. Client interviews shall be conducted through <strong>Google Meet</strong>, wherever applicable.<br/>
    2. The candidate may be required to undergo <strong>up to three (3) rounds of interviews with the Client</strong>, depending upon the Client's selection process.<br/>
    <strong>C.2 Candidate Selection &amp; Deployment</strong><br/>
    1. Candidate deployment/placement shall be subject to successful completion of the Client's interview and approval process.<br/>
    2. Final deployment shall also remain subject to completion of required documentation, verification and other applicable formalities.<br/>
    3. Deployment shall be made only after the applicable requirements have been completed and confirmed.</p>

    <p><strong>PART D – PSO / PERSONAL SECURITY OFFICER – SERVICE TERMS</strong><br/>
    <strong>D.1 Leave Entitlement (yearly PSO engagement)</strong><br/>
    1. The PSO shall be entitled to <strong>18 days of leave per year</strong>, subject to the applicable employment/service policy.<br/>
    2. One return travel ticket per year may be provided as part of the agreed annual service arrangement.<br/>
    3. Leave must be planned and communicated in advance to ensure continuity of service.<br/>
    <strong>D.2 Public Holidays</strong><br/>
    1. Public holidays shall be governed by the agreed service schedule and applicable Company/Client policy.<br/>
    2. Any requirement for PSO deployment on a public holiday shall be handled as per the applicable commercial and statutory terms.<br/>
    <strong>D.3 Overtime</strong><br/>
    1. The standard PSO service fee does not include overtime unless specifically agreed in writing.<br/>
    2. Any additional duty hours or overtime requirement shall be discussed and approved separately.<br/>
    <strong>D.4 Weekly Off</strong><br/>
    1. The PSO shall be provided a weekly off in accordance with the applicable duty schedule and legal requirements.<br/>
    2. If the Client requires continuous deployment without a weekly replacement, the same must be specifically agreed upon in advance.<br/>
    <strong>D.5 Single-Person Deployment / Replacement</strong><br/>
    1. Where the assignment is specifically contracted for <strong>single-person PSO deployment</strong>, routine replacement shall not be included in the standard service arrangement.<br/>
    2. Replacement may be considered in genuine circumstances such as resignation, medical emergency, disciplinary issue, non-performance or other valid reasons, subject to availability.<br/>
    3. Any replacement requirement should be communicated to WENS FORCE at the earliest to allow suitable arrangements.<br/>
    4. After completion of the initial <strong>3-month service period</strong>, routine replacement requests shall not be treated as a free replacement unless otherwise agreed in writing.<br/>
    <strong>D.6 Service Fee / Refund</strong><br/>
    1. Service fees paid for an active PSO deployment shall generally be <strong>non-refundable</strong>, subject to the terms of this Agreement.<br/>
    2. No refund shall be applicable merely due to a change in the Client's requirement after deployment, unless specifically provided for in the commercial agreement.<br/>
    3. Any cancellation or early termination shall be governed by the agreed contractual terms.</p>

    <p><strong>PART E – PSO ACCOMMODATION &amp; BASIC FACILITIES</strong><br/>
    Where accommodation is required/provided by the Client, the Client shall ensure that the PSO has access to basic facilities necessary for the assignment, including:<br/>
    1. Suitable sleeping/resting arrangement.<br/>
    2. Access to a <strong>washroom/toilet facility</strong>.<br/>
    3. Reasonable access to drinking water and basic amenities.<br/>
    4. Appropriate accommodation/security-room arrangement, wherever agreed.<br/>
    5. Basic facilities necessary to maintain the PSO's health, hygiene and readiness for duty.<br/>
    <strong>E.1 Food Preference</strong><br/>
    The Client's accommodation/food arrangement should take into consideration the PSO's mutually agreed food preference: (1) <strong>Vegetarian</strong>, or (2) <strong>Non-vegetarian</strong>. Any special dietary requirements should be communicated before deployment.</p>

    <p><strong>PART F – PSO INSURANCE</strong><br/>
    1. WENS FORCE may provide/arrange mandatory 3<sup>rd</sup> party personal insurance coverage for the deployed PSO as per the applicable Company policy and agreed service terms.<br/>
    2. The proposed insurance coverage is <strong>₹7,00,000 per PSO</strong>, subject to the terms, conditions and exclusions of the applicable insurance policy.<br/>
    3. An additional <strong>₹15,000 or actual per annum per PSO</strong> shall be payable to the Company towards the applicable insurance cost, where this amount forms part of the agreed commercial arrangement.<br/>
    4. Insurance coverage shall be subject to policy issuance, eligibility, insurer terms and applicable exclusions.<br/>
    5. Insurance charges shall be clearly mentioned in the commercial proposal/invoice wherever applicable.</p>

    <p><strong>PART G – GENERAL TERMS &amp; CONDITIONS</strong><br/>
    1. All PSO deployments shall be subject to proper documentation, verification and applicable security-agency requirements.<br/>
    2. The Client's specific duty requirements, working hours, location, accommodation, travel requirements and leave schedule should be confirmed before deployment.<br/>
    3. Any services or requirements outside the agreed scope shall be separately discussed and commercially approved.<br/>
    4. All applicable statutory requirements shall be complied with as applicable to the services and deployment.<br/>
    5. The Parties shall follow the terms and conditions mutually agreed upon in the executed commercial/service agreement.<br/>
    6. In case of any conflict between these commercial points and the executed agreement, the <strong>signed agreement shall prevail</strong>.</p>

    <p style="margin-top:22px;"><strong>ANNEXURE - I</strong></p>
    <p>Deployment chart indicating number and description of WENS FORCE Personnel.<br/>
    Post: Assistant at Security Department<br/>
    Total: ${personnel}</p>

    <p><strong>ANNEXURE – II</strong><br/>
    Statement indicating Charges (without any tax) for WENS Force Personnel on per Monthly basis for a shift of 12 hours plus resident type.<br/>
    Sr. No. 1<br/>
    Name of the Employee: <strong>Annexure – II</strong><br/>
    (Note: This contract remains valid in case said employee left or separate from the client, Company shall provide replacement of personnel as per set SLA.<br/>
    Name of Post: Assistant at Security Department<br/>
    1. Payment / Compensation: <strong>Annexure - I</strong> + Taxes<br/>
    2. No Meal Applicable (In office)<br/>
    3. All time Meal While Out Door<br/>
    4. Travelling Allowance (Metro Rail Pass + Local Commute Convenience)</p>

    <p style="margin-top:18px;"><strong>NOTE: 1) The rates offered by WENS FORCE and are accepted by you.<br/>
    2) The prevailing rates of Service Tax would be applicable from time to time.<br/>
    3) The Rates of Personnel Charges would also be made applicable to you, if raised by BoD.</strong></p>

    <p style="margin-top:28px;"><strong>Yours Sincerely,</strong></p>
    <p style="text-align:right;"><strong>Authorized Person Name, Signature and Date</strong></p>
    <p>For WENS FORCE INTERNATIONAL PVT. LTD.<br/>
    (ASST./DY./ADD. HUMAN RESOURCE)<br/>
    MANAGER, REGIONAL SERVICES WEST, INDIA<br/>
    MUMBAI, FORT HEADQUARTER - 400 001.</p>
    <p><strong>(Kamini Bomble)<br/>
    WENS FORCE – A division of WENS FORCE INTERNATIONAL Pvt. Ltd.<br/>
    Mumbai.</strong></p>

    <p style="text-align:center;font-size:11px;margin-top:32px;border-top:1px solid #999;padding-top:8px;line-height:1.45;">
      <strong>WENS Force International Private Limited</strong><br/>
      Office No. 89, Level 2, 2<sup>nd</sup> Foor, Empire Building, Opp. Chattrapati Shivaji Maharaj Terminus, Dr. Dadabhai Nauroji Rd., Fort, Mumbai 400001.<br/>
      Tel. 7304607954 | Email: hr@wensforce.com | www.wensforce.com
    </p>
  `.trim();
};

const buildBlankAgreementHtml = () => {
  return `
    <h1 style="text-align:center;font-size:22px;margin:0 0 16px;">New Agreement</h1>
    <p>Date: [AGREEMENT DATE]</p>
    <p>Client: [CLIENT NAME]</p>
    <p>City / Site: [SERVICE CITY] / [SITE / COVERAGE LOCATION]</p>
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
  ({ hidden = false, onResetToStandard = () => {} }, ref) => {
    const editorRef = useRef(null);
    const readyRef = useRef(false);

    const setHtml = (html) => {
      if (!editorRef.current) return;
      editorRef.current.innerHTML = html;
    };

    const loadStandard = () => {
      setHtml(buildDefaultAgreementHtml());
      readyRef.current = true;
    };

    const loadBlank = () => {
      setHtml(buildBlankAgreementHtml());
      readyRef.current = true;
      editorRef.current?.focus();
    };

    useEffect(() => {
      if (readyRef.current || !editorRef.current) return;
      setHtml(buildDefaultAgreementHtml());
      readyRef.current = true;
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        loadStandard,
        loadBlank,
        getHtml: () => editorRef.current?.innerHTML || "",
        getText: () => editorRef.current?.innerText || "",
      }),
      [],
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
