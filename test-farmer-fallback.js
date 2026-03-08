// Test script for Farmer Fallback functionality
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testFarmerFallback() {
  console.log('🧪 Testing Farmer Fallback Integration\n');
  console.log('=' .repeat(60));

  try {
    // Test Case: Farmer profile with weak Pinecone matches
    const farmerProfile = {
      age: 35,
      gender: 'Male',
      caste: 'SC',
      occupation: 'Farmer',
      income_range: 'below-1L',
      state: 'Tamil Nadu',
      disabled: false,
    };

    console.log('\n📝 Test Profile:');
    console.log(JSON.stringify(farmerProfile, null, 2));

    // Step 1: Create profile
    console.log('\n🔄 Step 1: Creating profile...');
    const createResponse = await fetch(`${BASE_URL}/api/v1/profiles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(farmerProfile),
    });

    if (!createResponse.ok) {
      throw new Error(`Profile creation failed: ${createResponse.status}`);
    }

    const profileData = await createResponse.json();
    const profileId = profileData.profile_id;
    console.log(`✅ Profile created: ${profileId}`);

    // Step 2: Get AI recommendations
    console.log('\n🔄 Step 2: Fetching AI recommendations...');
    const schemesResponse = await fetch(
      `${BASE_URL}/api/v1/profiles/${profileId}/schemes`
    );

    if (!schemesResponse.ok) {
      throw new Error(`Schemes fetch failed: ${schemesResponse.status}`);
    }

    const schemesData = await schemesResponse.json();
    console.log(`✅ Received ${schemesData.schemes.length} schemes`);

    // Step 3: Analyze results
    console.log('\n📊 Analysis:');
    console.log('=' .repeat(60));

    const fallbackSchemes = schemesData.schemes.filter(
      (s) => s.is_fallback === true || s.fallback_category
    );
    const regularSchemes = schemesData.schemes.filter(
      (s) => !s.is_fallback && !s.fallback_category
    );

    console.log(`\n🌾 Fallback Schemes: ${fallbackSchemes.length}`);
    console.log(`📋 Regular Schemes: ${regularSchemes.length}`);

    if (fallbackSchemes.length > 0) {
      console.log('\n✅ FARMER FALLBACK TRIGGERED!');
      console.log('\nFallback Schemes:');
      fallbackSchemes.forEach((scheme, idx) => {
        console.log(`\n${idx + 1}. ${scheme.name}`);
        console.log(`   Ministry: ${scheme.ministry}`);
        console.log(`   Final Score: ${(scheme.final_score * 100).toFixed(0)}%`);
        console.log(`   Category: ${scheme.fallback_category || scheme.category}`);
        console.log(`   Apply Link: ${scheme.apply_link}`);
      });
    } else {
      console.log('\n⚠️  Fallback NOT triggered');
      console.log('Top 3 Regular Schemes:');
      regularSchemes.slice(0, 3).forEach((scheme, idx) => {
        console.log(`\n${idx + 1}. ${scheme.name}`);
        console.log(`   Final Score: ${(scheme.final_score * 100).toFixed(0)}%`);
        console.log(`   Semantic Score: ${(scheme.semantic_score * 100).toFixed(0)}%`);
        console.log(`   Eligibility Score: ${(scheme.eligibility_score * 100).toFixed(0)}%`);
      });
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ TEST COMPLETED SUCCESSFULLY');
    console.log('=' .repeat(60));
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error.stack);
  }
}

// Run test
testFarmerFallback();
