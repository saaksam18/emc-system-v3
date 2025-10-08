export interface IPolicy {
    title: string;
    content: string[];
}

export const COMPANY_INFO = {
    name: 'Expat Motorbikes Cambodia (EMC motorbike rental)',
    address: 'No.38Eo, St.322, BKK 1, Chamkarmon, Phnom Penh',
    businessDays: 'Tuesday - Sunday',
    businessHours: 'AM 9:00 - PM 5:00',
    contactTel: '089 491 436',
    contactViber: '089-518-867 ( 日本語 , English)',
};

export const POLICIES: IPolicy[] = [
    // Policies remain the same as defined in the previous version
    {
        title: 'Compensation Policy',
        content: [
            'If the motorbike is stolen or seriously damaged (assessed as unavailable for rental service of EMC), you shall pay the compensation fee in total (specified in the form).',
            'The motorbike has no insurance for any loss or damage; you should take care of the motorbike in secure and be fully responsible for any loss and damage. In case of an accident or serious breakdown/trouble, you shall inform our company by calling immediately.',
            'You shall pay all the amount of compensation fee at one time basically (payment condition is negotiable).',
        ],
    },
    {
        title: 'Driven out of Phnom Penh city Penalties',
        content: [
            'Our scooter is exclusively permitted for use within the confines of Phnom Penh city. Any unauthorized use outside of',
            'this designated area incurs a daily penalty of $100.',
        ],
    },
    {
        title: 'Return/Exchange Policy',
        content: [
            '1. When you return/exchange the rental motorbike, you should fill the gasoline up before return/exchange. You shall fill gasoline up or pay some money as gasoline fee.',
            '2-1. You can exchange rental motorbikes at the same price if the rental motorbike has any trouble.',
            '2-2. When you want to exchange a more expensive type of motorbike and you keep on using this one, you need to pay the amount of price difference between the 2 motorbikes.',
        ],
    },
    {
        title: 'Repair Policy',
        content: [
            '1. Rental motorbike shall be used in Phnom Penh city area only. In case the motorbike is used outside of Phnom Penh city, you shall be responsible for any damage/problem concerning the motorbike. If the motorbike does not work outside of Phnom Penh city, you have to repair it to the original condition and inform EMC immediately.',
            '2. Even in breakdown/trouble of rental motorbike, you shall bring the motorbike back to EMC shop as long as the motorbike can run with safety.',
            '3. When rental motorbike tires or tubes get flat/broken during the rental period, you should pay repair fee by yourself except the first or second day of rental (Customer should pay the repair fee from the third day of rental).',
            '4. When rental motorbike parts, helmets, keys, and a key tag get lost or breakdown/damage owing to physical shock or 3rd party’s action, you are responsible for repair/compensation fee.',
            '5. When rental motorbike key or rental helmet is lost or damaged, the renter needs to pay some compensation (details are described in other paper).',
            '6. When rental motorbike parts get breakdown/damage under normal use (e.g. Light is off, gasoline gauge is not working), you can exchange the motor or ask for repair fee from EMC with the receipt that shows the actual expenses of standard market-price.',
            '7. EMC finds rental-motor has a problem/broken part when you return the motorbike to EMC; EMC is entitled to keep your deposit (passport, money or equivalent) until the full amount of repair/compensation fee is paid off.',
        ],
    },
    {
        title: 'Refund Policy',
        content: [
            'EMC shall refund 50% rental fee of the rest of your rental days when you get back the motor more than 1 week earlier before your scheduled return date.',
        ],
    },
    {
        title: 'Overdue Penalties',
        content: [
            '1. If your payment is overdue more than 3 days without any notice to EMC or without a specific reason (ex: unexpected accident/serious-illness), additionally you shall pay $2 per day as penalty charge for delay apart from rental fee.',
            '2. If your payment is overdue more than 10 days without any notice to EMC, EMC is entitled to visit your working place or residence without any notice to you for the purpose of investigating a situation, collecting the payment. In this case, you shall pay $6 per visit (EMC make a record of visit with physical evidences) as collection fee apart from rental fee & penalty charge.',
            '3. If you keep using rental motorbike without paying extension fee, penalty charge or collection fee, EMC can stop renting the motorbike anytime under EMC’s discretion and can repossess the motorbike without any notice to you. In this case, you still shall pay total unpaid amount (e.g. Penalty fee, Collection fee).',
        ],
    },
];
