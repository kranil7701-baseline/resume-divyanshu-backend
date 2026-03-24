import 'dotenv/config.js';
import Stripe from 'stripe';
import fs from 'fs';
import path from 'path';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function setupStripe() {
    try {
        console.log('Searching for existing products...');
        const products = await stripe.products.list();
        
        let monthlyPriceId, yearlyPriceId;

        let monthlyProduct = products.data.find(p => p.name === 'Pro Monthly');
        if (!monthlyProduct) {
            console.log('Creating Pro Monthly Product...');
            monthlyProduct = await stripe.products.create({
                name: 'Pro Monthly',
                description: 'Unlimited Resume Generations - Monthly Plan',
            });
            const monthlyPrice = await stripe.prices.create({
                product: monthlyProduct.id,
                unit_amount: 1000, // $10.00
                currency: 'usd',
                recurring: { interval: 'month' },
            });
            monthlyPriceId = monthlyPrice.id;
        } else {
            console.log('Found existing Pro Monthly Product:', monthlyProduct.id);
            const prices = await stripe.prices.list({ product: monthlyProduct.id });
            monthlyPriceId = prices.data[0]?.id;
        }

        let yearlyProduct = products.data.find(p => p.name === 'Pro Yearly');
        if (!yearlyProduct) {
            console.log('Creating Pro Yearly Product...');
            yearlyProduct = await stripe.products.create({
                name: 'Pro Yearly',
                description: 'Unlimited Resume Generations - Yearly Plan',
            });
            const yearlyPrice = await stripe.prices.create({
                product: yearlyProduct.id,
                unit_amount: 7000, // $70.00
                currency: 'usd',
                recurring: { interval: 'year' },
            });
            yearlyPriceId = yearlyPrice.id;
        } else {
            console.log('Found existing Pro Yearly Product:', yearlyProduct.id);
            const prices = await stripe.prices.list({ product: yearlyProduct.id });
            yearlyPriceId = prices.data[0]?.id;
        }

        console.log(`\nMonthly Price ID: ${monthlyPriceId}`);
        console.log(`Yearly Price ID: ${yearlyPriceId}`);

        // Update .env file
        const envPath = path.resolve(process.cwd(), '.env');
        let envContent = fs.readFileSync(envPath, 'utf8');

        if (!envContent.includes('STRIPE_MONTHLY_PRICE_ID')) {
            envContent += `\nSTRIPE_MONTHLY_PRICE_ID=${monthlyPriceId}`;
        } else {
            envContent = envContent.replace(/STRIPE_MONTHLY_PRICE_ID=.*/, `STRIPE_MONTHLY_PRICE_ID=${monthlyPriceId}`);
        }

        if (!envContent.includes('STRIPE_YEARLY_PRICE_ID')) {
            envContent += `\nSTRIPE_YEARLY_PRICE_ID=${yearlyPriceId}`;
        } else {
            envContent = envContent.replace(/STRIPE_YEARLY_PRICE_ID=.*/, `STRIPE_YEARLY_PRICE_ID=${yearlyPriceId}`);
        }

        fs.writeFileSync(envPath, envContent);
        console.log('.env file updated successfully!');

    } catch (error) {
        console.error('Error setting up Stripe:', error);
    }
}

setupStripe();
