/**
 * Direct ImageKit Test Script
 * Run with: npx tsx scripts/test-imagekit.ts
 */

import ImageKit from 'imagekit';
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
config({ path: '.env.local' });

const imagekit = new ImageKit({
    publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY || 'public_DRZyuw7wkmBFjF75SSluw33h9Vc=',
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY || 'private_nUDu8zvkqD43H0QaxP1K0GMuG/o=',
    urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || 'https://ik.imagekit.io/d6s8a2mzi',
});

async function runTests() {
    console.log('\n========================================');
    console.log('ImageKit Direct Test Script');
    console.log('========================================\n');

    // Test 1: Authentication Parameters
    console.log('1. Testing Authentication Parameters...');
    try {
        const authParams = imagekit.getAuthenticationParameters();
        console.log('   ✓ Auth params generated:', {
            hasSignature: !!authParams.signature,
            hasToken: !!authParams.token,
            expire: authParams.expire,
        });
    } catch (error: any) {
        console.error('   ✗ Auth failed:', error.message);
    }

    // Test 2: List Files
    console.log('\n2. Testing File List...');
    try {
        const files = await imagekit.listFiles({ limit: 5 });
        console.log(`   ✓ Found ${files.length} files`);
        if (files.length > 0) {
            const firstItem = files[0] as any;
            console.log('   First file:', firstItem.name, '-', firstItem.url || 'N/A');
        }
    } catch (error: any) {
        console.error('   ✗ List files failed:', error.message);
    }

    // Test 3: Upload with base64 string
    console.log('\n3. Testing Upload with Base64...');
    try {
        // Small 1x1 red PNG
        const base64Image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
        
        const response = await imagekit.upload({
            file: base64Image,
            fileName: `test-${Date.now()}.png`,
            folder: '/test-uploads',
        });
        console.log('   ✓ Upload successful!');
        console.log('   File ID:', response.fileId);
        console.log('   URL:', response.url);
        
        // Cleanup
        await imagekit.deleteFile(response.fileId);
        console.log('   ✓ Test file cleaned up');
    } catch (error: any) {
        console.error('   ✗ Upload failed:', error.message);
        if (error.response) {
            console.error('   Response:', JSON.stringify(error.response, null, 2));
        }
    }

    // Test 4: Upload with URL
    console.log('\n4. Testing Upload from URL...');
    try {
        const response = await imagekit.upload({
            file: 'https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png',
            fileName: `test-url-${Date.now()}.png`,
            folder: '/test-uploads',
        });
        console.log('   ✓ URL Upload successful!');
        console.log('   File ID:', response.fileId);
        
        // Cleanup
        await imagekit.deleteFile(response.fileId);
        console.log('   ✓ Test file cleaned up');
    } catch (error: any) {
        console.error('   ✗ URL Upload failed:', error.message);
    }

    // Test 5: Upload with Buffer
    console.log('\n5. Testing Upload with Buffer...');
    try {
        const buffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==', 'base64');
        
        const response = await imagekit.upload({
            file: buffer,
            fileName: `test-buffer-${Date.now()}.png`,
            folder: '/test-uploads',
        });
        console.log('   ✓ Buffer Upload successful!');
        console.log('   File ID:', response.fileId);
        
        // Cleanup
        await imagekit.deleteFile(response.fileId);
        console.log('   ✓ Test file cleaned up');
    } catch (error: any) {
        console.error('   ✗ Buffer Upload failed:', error.message);
    }

    console.log('\n========================================');
    console.log('Tests Complete');
    console.log('========================================\n');
}

runTests().catch(console.error);
