<!DOCTYPE html>
<html>
<head>
    <title>Scooter Rental Contract</title>
    <style>
        /* General Styling for PDF */
        body { font-family: sans-serif; margin: 0; padding: 20px; font-size: 10pt; }
        .header { text-align: center; margin-bottom: 20px; }
        .header img { max-width: 150px; height: auto; margin-bottom: 10px; }
        .contact-info, .section-title, .contract-text { margin-bottom: 20px; }
        .section-title { font-size: 12pt; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 5px; margin-top: 25px; }
        .two-col-table { width: 100%; border-collapse: collapse; }
        .two-col-table td { padding: 4px 0; }
        .contract-body { margin-top: 20px; }
        .contract-body p { margin-bottom: 10px; line-height: 1.4; white-space: pre-wrap; }
        .signature-block { display: flex; justify-content: space-between; margin-top: 50px; }
        .signature-block div { width: 45%; border-top: 1px solid #000; padding-top: 5px; }
        .policy-section p { white-space: pre-wrap; } /* Preserve white space for customizable text */
    </style>
</head>
<body>

    <div class="header">
        <img src="{{ public_path('images/emc_logo.png') }}" alt="EMC Logo"> {{-- **Replace with actual path to your asset** --}}
        [cite_start]<h2>Expat Motorbikes Cambodia (EMC motorbike rental)</h2> [cite: 1]
    </div>

    <div class="contact-info">
        <table class="two-col-table">
            <tr>
                <td style="width: 50%;">
                    <strong>Address:</strong> [cite_start]{{ $emc_address ?? 'No.38Eo, St.322, BKK 1, Chamkarmon, Phnom Penh' }} [cite: 2]<br>
                    <strong>Business Days:</strong> [cite_start]{{ $emc_business_days ?? 'From Tuesday - Sunday' }}, Closed on Mondays and National Holidays [cite: 2]<br>
                    <strong>Business Hours:</strong> [cite_start]{{ $emc_business_hours ?? 'AM9:00 - PM5:00' }} [cite: 2]
                </td>
                <td style="width: 50%;">
                    <strong>Contact:</strong> Tel: {{ $emc_tel ?? '089 491 436' }}, SMS or Viber: [cite_start]{{ $emc_viber ?? '089-518-867' }} ( 日本語 , English) [cite: 2]<br>
                    [cite_start]<small>*Contact us in case of emergency problem even outside business hours</small> [cite: 2]
                </td>
            </tr>
        </table>
    </div>

    <div class="section-title">Customer Information</div>
    <table class="two-col-table">
        <tr>
            <td><strong>Customer Name:</strong> [cite_start]{{ $renter_name ?? '.........................................................' }} [cite: 3]</td>
            <td><strong>Sex:</strong> [cite_start]{{ $renter_sex ?? '□ male □ female' }} [cite: 3]</td>
        </tr>
        <tr>
            <td colspan="2">
                <strong>Nationality:</strong> [cite_start]{{ $renter_nationality ?? '□ USA □ France □ German □ England □ Korea □ Philippines □ Australia □ Japan □ Cambodia □ other………………………' }} [cite: 4]
            </td>
        </tr>
        <tr>
            <td><strong>Phone Number:</strong> [cite_start]{{ $renter_phone ?? '.........................................................' }} [cite: 5]</td>
            <td><strong>Occupation in Cambodia:</strong> [cite_start]{{ $renter_occupation ?? '.........................................' }} [cite: 5]</td>
        </tr>
        <tr>
            <td colspan="2">
                <strong>Present Address in Cambodia:</strong> [cite_start]{{ $renter_address ?? '..................................................................................................................' }} [cite: 6]
            </td>
        </tr>
    </table>

    <div class="section-title">Rental Details</div>
    <table class="two-col-table">
        <tr>
            <td><strong>Rental Date:</strong> [cite_start]{{ $rental_date ?? '.........................................................' }} [cite: 7]</td>
            <td><strong>Return Date:</strong> [cite_start]{{ $return_date ?? '.........................................................' }} [cite: 7]</td>
        </tr>
        <tr>
            <td><strong>Rental Period:</strong> [cite_start]{{ $rental_period ?? '□ ………days, □ …Month' }} PM6:00 [cite: 8]</td>
            <td><strong>Helmet Rental:</strong> [cite_start]{{ $helmet_rental ?? '□ Yes □ No' }} [cite: 9]</td>
        </tr>
        <tr>
            <td colspan="2">
                <strong>Motor ID:</strong> [cite_start]{{ $motor_id ?? '............' }}[cite: 23], 
                <strong>Plate No.:</strong> [cite_start]{{ $plate_no ?? '....................................' }}[cite: 23], 
                <strong>Motor Type:</strong> [cite_start]{{ $motor_type ?? '....................................' }}[cite: 23], 
                [cite_start]{{ $motor_transmission ?? '□ MT, □ AT, □ AT 50cc' }} [cite: 23]
            </td>
        </tr>
    </table>

    <div class="section-title">Fees and Deposit</div>
    <table class="two-col-table" style="border: 1px solid #000;">
        <tr>
            <td style="width: 25%; padding: 5px;"><strong>Rental Fee:</strong></td>
            <td style="width: 25%; padding: 5px;"><strong>Total Rental Fee:</strong></td>
            <td style="width: 50%; padding: 5px;"><strong>Deposit for Motorbike Rental:</strong></td>
        </tr>
        <tr>
            <td style="padding: 5px;">
                □ 1-7 days: ${{ $fee_1_7_days ?? '…………' }} [cite_start] [cite: 24]<br>
                □ 8-19 days: ${{ $fee_8_19_days ?? '…………' }}/day [cite_start] [cite: 24]<br>
                □ 1 month: ${{ $fee_1_month ?? '…………' }} [cite_start] [cite: 24]
            </td>
            <td style="padding: 5px;">
                ${{ $total_rental_fee ?? '…………' }} [cite_start] [cite: 24]
            </td>
            <td style="padding: 5px;">
                □ Deposit: ${{ $deposit_amount ?? '…………' }} [cite_start] [cite: 24] (The same price as compensation fee)<br>
                <strong>Deposit Type:</strong><br>
                [cite_start]{{ $deposit_type ?? '□ Your Passport, □ Other……………………………' }} [cite: 24]
            </td>
        </tr>
    </table>

    <div class="section-title">Terms & Conditions / Policies</div>
    <div class="policy-section">
        
        <p class="section-title" style="margin-top: 10px;">Compensation Policy</p>
        <div class="contract-text">
            <p>If the motorbike is stolen or seriously damaged (assessed as unavailable for rental service of EMC), you shall pay ${{ $compensation_fee ?? '…………' }} [cite_start] as compensation fee in total [cite: 26].</p>
            <p>**[cite_start]{{ $compensation_policy_text ?? 'The motorbike has no insurance for any loss or damage; you should take care of the motorbike in secure and be fully responsible for any loss and damage. In case of an accident or serious breakdown/trouble, you shall inform our company by calling immediately. You shall pay all the amount of compensation fee at one time basically (payment condition is negotiable).' }}** [cite: 27, 28, 29, 30]</p>
        </div>

        <p class="section-title" style="margin-top: 10px;">Return/Exchange Policy</p>
        <div class="contract-text">
            <p>**[cite_start]{{ $return_policy_text ?? '1. When you return/exchange the rental motorbike, you should fill the gasoline up before return/exchange. You shall fill gasoline up or pay some money as gasoline fee. 2-1. You can exchange rental motorbikes at the same price if the rental motorbike has any trouble. 2-2. When you want to exchange more expensive type of motorbike and you keep on using this one, you need to pay the amount of price difference between the 2 motorbikes.' }}** [cite: 32, 33, 34, 35]</p>
        </div>

        <p class="section-title" style="margin-top: 10px;">Repair Policy</p>
        <div class="contract-text">
            <p>**[cite_start]{{ $repair_policy_text ?? '1. Rental motorbike shall be used in Phnom Penh city area only. In case the motorbike is used outside of Phnom Penh city, you shall be responsible for any damage/problem concerning the motorbike. If the motorbike does not work outside of Phnom Penh city, you have to repair it to the original condition and inform EMC immediately. 2. Even in breakdown/trouble of rental motorbike, you shall bring the motorbike back to EMC shop as long as the motorbike can run with safety. 3. When rental motorbike tires or tubes are got flat/broken during the rental period, you should pay repair fee by yourself except first or second day of rental (Customer should pay the repair fee from third day of rental). 4. When rental motorbike parts, helmets, keys, and a key tag get lost or breakdown/damage owing to physical shock or 3rd party’s action, you are responsible for repair/compensation fee. 5. When rental motorbike key or rental helmet is lost or damaged, the renter needs to pay some compensation. (Details are described in other paper) 6. When rental motorbike parts get breakdown/damage under normal use (e.g. Light is off, gasoline gauge is not working), you can exchange the motor or ask for repair fee from EMC with the receipt that shows the actual expenses of standard market-price. 7. EMC finds rental-motor has a problem/broken part when you return the motorbike to EMC; EMC is entitled to keep your deposit (passport, money or equivalent until the full amount of repair/compensation fee is paid off.' }}** [cite: 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47]</p>
        </div>

        <p class="section-title" style="margin-top: 10px;">Phone Number & Address Change</p>
        <div class="contract-text">
            <p>**[cite_start]{{ $phone_address_change_text ?? 'When you change the phone number or current address in Phnom Penh city, NEVER FAIL TO LET US KNOW your new phone number or new address via SMS mail, phone, or Facebook.' }}** [cite: 49]</p>
        </div>

        <p class="section-title" style="margin-top: 10px;">Refund Policy</p>
        <div class="contract-text">
            <p>**[cite_start]{{ $refund_policy_text ?? 'EMC shall refund 50% rental fee of the rest of your rental days when you get back the motor more than 1 week earlier before your scheduled return date.' }}** [cite: 51]</p>
        </div>

        <p class="section-title" style="margin-top: 10px;">Overdue Penalties</p>
        <div class="contract-text">
            <p>**[cite_start]{{ $overdue_penalties_text ?? '1. If your payment is overdue more than 3 days without any notice to EMC or without a specific reason (ex: unexpected accident/serious-illness), additionally you shall pay $2 per day as penalty charge for delay apart from rental fee. 2. If your payment is overdue more than 10 days without any notice to EMC, EMC is entitled to visit your working place or residence without any notice to you for the purpose of investigating a situation, collecting the payment. In this case, you shall pay $6 per visit (EMC make a record of visit with physical evidences) as collection fee apart from rental fee & penalty charge. 3. If you keep using rental motorbike without paying extension fee, penalty charge or collection fee, EMC can stop renting the motorbike anytime under EMC’s discretion and can repossess the motorbike without any notice to you. In this case, you still shall pay total unpaid amount (e.g. Penalty fee, Collection fee)' }}** [cite: 53, 54, 55, 56, 57]</p>
        </div>

        <p class="section-title" style="margin-top: 10px;">The effect of the contract</p>
        <div class="contract-text">
            <p>**[cite_start]{{ $effect_contract_text ?? 'When you make an extension rental or a motorbike exchange contract with EMC, all the articles and policies in this contract except the amount of compensation fee remain effective until you return your rental motorbike to EMC.' }}** [cite: 59]</p>
        </div>

    </div>

    <div class="signature-block">
        <div style="text-align: center;">
            <p>The Renter: [cite_start]{{ $renter_signature ?? '.........................................' }} [cite: 61]</p>
        </div>
        <div style="text-align: center;">
            <p>Staff Name: [cite_start]{{ $staff_name ?? '.........................................' }} [cite: 61]</p>
        </div>
    </div>

</body>
</html>
