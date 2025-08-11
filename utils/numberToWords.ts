// A simple number-to-words converter for Indian currency format.
// This is a simplified version and may not cover all edge cases for very large numbers.

const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

function convert_lt_100(n: number): string {
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    const ten = Math.floor(n / 10);
    const one = n % 10;
    return `${tens[ten]} ${ones[one]}`.trim();
}

function convert_lt_1000(n: number): string {
    if (n < 100) return convert_lt_100(n);
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    let res = `${ones[hundred]} Hundred`;
    if (rest > 0) {
        res += ` ${convert_lt_100(rest)}`;
    }
    return res;
}

export function numberToWords(num: number): string {
    if (num === 0) return 'Zero';

    const floatPart = Math.round((num - Math.floor(num)) * 100);
    let n = Math.floor(num);
    
    let word = '';

    if (n >= 10000000) {
        const crores = Math.floor(n / 10000000);
        word += `${convert_lt_100(crores)} Crore `;
        n %= 10000000;
    }
    if (n >= 100000) {
        const lakhs = Math.floor(n / 100000);
        word += `${convert_lt_100(lakhs)} Lakh `;
        n %= 100000;
    }
    if (n >= 1000) {
        const thousands = Math.floor(n / 1000);
        word += `${convert_lt_1000(thousands)} Thousand `;
        n %= 1000;
    }
    if (n > 0) {
        word += convert_lt_1000(n);
    }
    
    let finalWord = word.trim();
    if (finalWord === '') {
        finalWord = 'Zero'
    }

    if (floatPart > 0) {
      finalWord += ` and ${convert_lt_100(floatPart)} Paise`;
    }
    return finalWord;
}