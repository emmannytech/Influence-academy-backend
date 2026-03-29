import { PrismaClient, UserRole, SetupCategory } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create admin user (must also exist in Supabase Auth)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@influenceacademy.com' },
    update: {},
    create: {
      supabaseId: '00000000-0000-0000-0000-000000000001',
      email: 'admin@influenceacademy.com',
      role: UserRole.admin,
      isVerified: true,
    },
  });

  console.log(`Seeded admin user: ${admin.id}`);

  // Seed setup items
  await seedSetupItems();

  // Seed cities (depends on countries being seeded first)
  await seedCities();
}

async function seedSetupItems() {
  const items = [
    // Countries
    { category: SetupCategory.country, label: 'Nigeria', value: 'nigeria', sortOrder: 10 },
    { category: SetupCategory.country, label: 'Ghana', value: 'ghana', sortOrder: 20 },
    { category: SetupCategory.country, label: 'South Africa', value: 'south-africa', sortOrder: 30 },
    { category: SetupCategory.country, label: 'Kenya', value: 'kenya', sortOrder: 40 },
    { category: SetupCategory.country, label: 'Egypt', value: 'egypt', sortOrder: 50 },
    { category: SetupCategory.country, label: 'Tanzania', value: 'tanzania', sortOrder: 60 },
    { category: SetupCategory.country, label: 'Uganda', value: 'uganda', sortOrder: 70 },
    { category: SetupCategory.country, label: 'Rwanda', value: 'rwanda', sortOrder: 80 },
    { category: SetupCategory.country, label: 'Ethiopia', value: 'ethiopia', sortOrder: 90 },
    { category: SetupCategory.country, label: 'Cameroon', value: 'cameroon', sortOrder: 100 },
    { category: SetupCategory.country, label: 'Senegal', value: 'senegal', sortOrder: 110 },
    { category: SetupCategory.country, label: 'Morocco', value: 'morocco', sortOrder: 120 },
    { category: SetupCategory.country, label: 'United Kingdom', value: 'united-kingdom', sortOrder: 130 },
    { category: SetupCategory.country, label: 'United States', value: 'united-states', sortOrder: 140 },
    { category: SetupCategory.country, label: 'Canada', value: 'canada', sortOrder: 150 },
    { category: SetupCategory.country, label: 'United Arab Emirates', value: 'united-arab-emirates', sortOrder: 160 },
    { category: SetupCategory.country, label: 'Saudi Arabia', value: 'saudi-arabia', sortOrder: 170 },
    { category: SetupCategory.country, label: 'India', value: 'india', sortOrder: 180 },
    { category: SetupCategory.country, label: 'Brazil', value: 'brazil', sortOrder: 190 },
    { category: SetupCategory.country, label: 'Germany', value: 'germany', sortOrder: 200 },

    // Niches
    { category: SetupCategory.niche, label: 'Fashion', value: 'fashion', sortOrder: 10 },
    { category: SetupCategory.niche, label: 'Beauty', value: 'beauty', sortOrder: 20 },
    { category: SetupCategory.niche, label: 'Lifestyle', value: 'lifestyle', sortOrder: 30 },
    { category: SetupCategory.niche, label: 'Travel', value: 'travel', sortOrder: 40 },
    { category: SetupCategory.niche, label: 'Food', value: 'food', sortOrder: 50 },
    { category: SetupCategory.niche, label: 'Fitness', value: 'fitness', sortOrder: 60 },
    { category: SetupCategory.niche, label: 'Technology', value: 'technology', sortOrder: 70 },
    { category: SetupCategory.niche, label: 'Gaming', value: 'gaming', sortOrder: 80 },
    { category: SetupCategory.niche, label: 'Education', value: 'education', sortOrder: 90 },
    { category: SetupCategory.niche, label: 'Entertainment', value: 'entertainment', sortOrder: 100 },
    { category: SetupCategory.niche, label: 'Health', value: 'health', sortOrder: 110 },
    { category: SetupCategory.niche, label: 'Finance', value: 'finance', sortOrder: 120 },
    { category: SetupCategory.niche, label: 'Parenting', value: 'parenting', sortOrder: 130 },
    { category: SetupCategory.niche, label: 'Sports', value: 'sports', sortOrder: 140 },
    { category: SetupCategory.niche, label: 'Music', value: 'music', sortOrder: 150 },

    // Platforms
    { category: SetupCategory.platform, label: 'Instagram', value: 'instagram', sortOrder: 10 },
    { category: SetupCategory.platform, label: 'TikTok', value: 'tiktok', sortOrder: 20 },
    { category: SetupCategory.platform, label: 'YouTube', value: 'youtube', sortOrder: 30 },
    { category: SetupCategory.platform, label: 'X (Twitter)', value: 'x', sortOrder: 40 },
    { category: SetupCategory.platform, label: 'Facebook', value: 'facebook', sortOrder: 50 },
    { category: SetupCategory.platform, label: 'LinkedIn', value: 'linkedin', sortOrder: 60 },
    { category: SetupCategory.platform, label: 'Snapchat', value: 'snapchat', sortOrder: 70 },

    // Industries
    { category: SetupCategory.industry, label: 'Fashion & Apparel', value: 'fashion-apparel', sortOrder: 10 },
    { category: SetupCategory.industry, label: 'Beauty & Cosmetics', value: 'beauty-cosmetics', sortOrder: 20 },
    { category: SetupCategory.industry, label: 'Technology', value: 'technology', sortOrder: 30 },
    { category: SetupCategory.industry, label: 'Food & Beverage', value: 'food-beverage', sortOrder: 40 },
    { category: SetupCategory.industry, label: 'Health & Wellness', value: 'health-wellness', sortOrder: 50 },
    { category: SetupCategory.industry, label: 'Finance', value: 'finance', sortOrder: 60 },
    { category: SetupCategory.industry, label: 'Education', value: 'education', sortOrder: 70 },
    { category: SetupCategory.industry, label: 'Entertainment', value: 'entertainment', sortOrder: 80 },
    { category: SetupCategory.industry, label: 'Automotive', value: 'automotive', sortOrder: 90 },
    { category: SetupCategory.industry, label: 'Real Estate', value: 'real-estate', sortOrder: 100 },
    { category: SetupCategory.industry, label: 'Travel & Hospitality', value: 'travel-hospitality', sortOrder: 110 },
    { category: SetupCategory.industry, label: 'E-commerce', value: 'e-commerce', sortOrder: 120 },
  ];

  const result = await prisma.setupItem.createMany({
    data: items,
    skipDuplicates: true,
  });

  console.log(`Seeded ${result.count} setup items`);
}

async function seedCities() {
  // Fetch all countries to get their IDs
  const countries = await prisma.setupItem.findMany({
    where: { category: SetupCategory.country },
  });

  const countryMap = new Map(countries.map((c) => [c.value, c.id]));

  // Cities grouped by country value
  const citiesByCountry: Record<string, { label: string; value: string; sortOrder: number }[]> = {
    nigeria: [
      { label: 'Lagos', value: 'lagos', sortOrder: 10 },
      { label: 'Abuja', value: 'abuja', sortOrder: 20 },
      { label: 'Port Harcourt', value: 'port-harcourt', sortOrder: 30 },
      { label: 'Kano', value: 'kano', sortOrder: 40 },
      { label: 'Ibadan', value: 'ibadan', sortOrder: 50 },
    ],
    ghana: [
      { label: 'Accra', value: 'accra', sortOrder: 10 },
      { label: 'Kumasi', value: 'kumasi', sortOrder: 20 },
      { label: 'Tamale', value: 'tamale', sortOrder: 30 },
      { label: 'Takoradi', value: 'takoradi', sortOrder: 40 },
      { label: 'Cape Coast', value: 'cape-coast', sortOrder: 50 },
    ],
    'south-africa': [
      { label: 'Johannesburg', value: 'johannesburg', sortOrder: 10 },
      { label: 'Cape Town', value: 'cape-town', sortOrder: 20 },
      { label: 'Durban', value: 'durban', sortOrder: 30 },
      { label: 'Pretoria', value: 'pretoria', sortOrder: 40 },
      { label: 'Port Elizabeth', value: 'port-elizabeth', sortOrder: 50 },
    ],
    kenya: [
      { label: 'Nairobi', value: 'nairobi', sortOrder: 10 },
      { label: 'Mombasa', value: 'mombasa', sortOrder: 20 },
      { label: 'Kisumu', value: 'kisumu', sortOrder: 30 },
      { label: 'Nakuru', value: 'nakuru', sortOrder: 40 },
      { label: 'Eldoret', value: 'eldoret', sortOrder: 50 },
    ],
    egypt: [
      { label: 'Cairo', value: 'cairo', sortOrder: 10 },
      { label: 'Alexandria', value: 'alexandria', sortOrder: 20 },
      { label: 'Giza', value: 'giza', sortOrder: 30 },
      { label: 'Sharm El Sheikh', value: 'sharm-el-sheikh', sortOrder: 40 },
      { label: 'Luxor', value: 'luxor', sortOrder: 50 },
    ],
    tanzania: [
      { label: 'Dar es Salaam', value: 'dar-es-salaam', sortOrder: 10 },
      { label: 'Dodoma', value: 'dodoma', sortOrder: 20 },
      { label: 'Arusha', value: 'arusha', sortOrder: 30 },
      { label: 'Mwanza', value: 'mwanza', sortOrder: 40 },
      { label: 'Zanzibar City', value: 'zanzibar-city', sortOrder: 50 },
    ],
    uganda: [
      { label: 'Kampala', value: 'kampala', sortOrder: 10 },
      { label: 'Entebbe', value: 'entebbe', sortOrder: 20 },
      { label: 'Jinja', value: 'jinja', sortOrder: 30 },
      { label: 'Gulu', value: 'gulu', sortOrder: 40 },
      { label: 'Mbarara', value: 'mbarara', sortOrder: 50 },
    ],
    rwanda: [
      { label: 'Kigali', value: 'kigali', sortOrder: 10 },
      { label: 'Butare', value: 'butare', sortOrder: 20 },
      { label: 'Gisenyi', value: 'gisenyi', sortOrder: 30 },
      { label: 'Ruhengeri', value: 'ruhengeri', sortOrder: 40 },
    ],
    ethiopia: [
      { label: 'Addis Ababa', value: 'addis-ababa', sortOrder: 10 },
      { label: 'Dire Dawa', value: 'dire-dawa', sortOrder: 20 },
      { label: 'Gondar', value: 'gondar', sortOrder: 30 },
      { label: 'Hawassa', value: 'hawassa', sortOrder: 40 },
      { label: 'Bahir Dar', value: 'bahir-dar', sortOrder: 50 },
    ],
    cameroon: [
      { label: 'Douala', value: 'douala', sortOrder: 10 },
      { label: 'Yaoundé', value: 'yaounde', sortOrder: 20 },
      { label: 'Bamenda', value: 'bamenda', sortOrder: 30 },
      { label: 'Bafoussam', value: 'bafoussam', sortOrder: 40 },
      { label: 'Limbe', value: 'limbe', sortOrder: 50 },
    ],
    senegal: [
      { label: 'Dakar', value: 'dakar', sortOrder: 10 },
      { label: 'Saint-Louis', value: 'saint-louis', sortOrder: 20 },
      { label: 'Thiès', value: 'thies', sortOrder: 30 },
      { label: 'Touba', value: 'touba', sortOrder: 40 },
    ],
    morocco: [
      { label: 'Casablanca', value: 'casablanca', sortOrder: 10 },
      { label: 'Marrakech', value: 'marrakech', sortOrder: 20 },
      { label: 'Rabat', value: 'rabat', sortOrder: 30 },
      { label: 'Fez', value: 'fez', sortOrder: 40 },
      { label: 'Tangier', value: 'tangier', sortOrder: 50 },
    ],
    'united-kingdom': [
      { label: 'London', value: 'london', sortOrder: 10 },
      { label: 'Manchester', value: 'manchester', sortOrder: 20 },
      { label: 'Birmingham', value: 'birmingham', sortOrder: 30 },
      { label: 'Edinburgh', value: 'edinburgh', sortOrder: 40 },
      { label: 'Liverpool', value: 'liverpool', sortOrder: 50 },
    ],
    'united-states': [
      { label: 'New York', value: 'new-york', sortOrder: 10 },
      { label: 'Los Angeles', value: 'los-angeles', sortOrder: 20 },
      { label: 'Chicago', value: 'chicago', sortOrder: 30 },
      { label: 'Houston', value: 'houston', sortOrder: 40 },
      { label: 'Miami', value: 'miami', sortOrder: 50 },
    ],
    canada: [
      { label: 'Toronto', value: 'toronto', sortOrder: 10 },
      { label: 'Vancouver', value: 'vancouver', sortOrder: 20 },
      { label: 'Montreal', value: 'montreal', sortOrder: 30 },
      { label: 'Calgary', value: 'calgary', sortOrder: 40 },
      { label: 'Ottawa', value: 'ottawa', sortOrder: 50 },
    ],
    'united-arab-emirates': [
      { label: 'Dubai', value: 'dubai', sortOrder: 10 },
      { label: 'Abu Dhabi', value: 'abu-dhabi', sortOrder: 20 },
      { label: 'Sharjah', value: 'sharjah', sortOrder: 30 },
      { label: 'Ajman', value: 'ajman', sortOrder: 40 },
    ],
    'saudi-arabia': [
      { label: 'Riyadh', value: 'riyadh', sortOrder: 10 },
      { label: 'Jeddah', value: 'jeddah', sortOrder: 20 },
      { label: 'Mecca', value: 'mecca', sortOrder: 30 },
      { label: 'Medina', value: 'medina', sortOrder: 40 },
      { label: 'Dammam', value: 'dammam', sortOrder: 50 },
    ],
    india: [
      { label: 'Mumbai', value: 'mumbai', sortOrder: 10 },
      { label: 'Delhi', value: 'delhi', sortOrder: 20 },
      { label: 'Bangalore', value: 'bangalore', sortOrder: 30 },
      { label: 'Hyderabad', value: 'hyderabad', sortOrder: 40 },
      { label: 'Chennai', value: 'chennai', sortOrder: 50 },
    ],
    brazil: [
      { label: 'São Paulo', value: 'sao-paulo', sortOrder: 10 },
      { label: 'Rio de Janeiro', value: 'rio-de-janeiro', sortOrder: 20 },
      { label: 'Brasília', value: 'brasilia', sortOrder: 30 },
      { label: 'Salvador', value: 'salvador', sortOrder: 40 },
      { label: 'Fortaleza', value: 'fortaleza', sortOrder: 50 },
    ],
    germany: [
      { label: 'Berlin', value: 'berlin', sortOrder: 10 },
      { label: 'Munich', value: 'munich', sortOrder: 20 },
      { label: 'Frankfurt', value: 'frankfurt', sortOrder: 30 },
      { label: 'Hamburg', value: 'hamburg', sortOrder: 40 },
      { label: 'Cologne', value: 'cologne', sortOrder: 50 },
    ],
  };

  const cityItems: {
    category: SetupCategory;
    label: string;
    value: string;
    sortOrder: number;
    parentId: string;
  }[] = [];

  for (const [countryValue, cities] of Object.entries(citiesByCountry)) {
    const parentId = countryMap.get(countryValue);
    if (!parentId) {
      console.warn(`Country '${countryValue}' not found, skipping its cities`);
      continue;
    }
    for (const city of cities) {
      cityItems.push({
        category: SetupCategory.city,
        label: city.label,
        value: city.value,
        sortOrder: city.sortOrder,
        parentId,
      });
    }
  }

  const result = await prisma.setupItem.createMany({
    data: cityItems,
    skipDuplicates: true,
  });

  console.log(`Seeded ${result.count} cities`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
