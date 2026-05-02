import { getAllInjuries } from './src/data-collection/adapters/ESPN/injuries';

async function test() {
  try {
    const injuries = await getAllInjuries();
    console.log(`Total injuries: ${injuries.length}`);
    
    // Print first 10 for inspection
    injuries.slice(0, 10).forEach(i => {
      console.log(`- ${i.player.name} | Team: ${i.teamName} | Status: ${i.status}`);
    });

    // Search specifically for the problematic ones
    const problematic = injuries.filter(i => 
      i.player.name.includes('Ja Morant') || 
      i.player.name.includes('Zach Edey') ||
      i.player.name.includes('Walter Clayton')
    );

    console.log('\nProblematic players data:');
    problematic.forEach(i => {
      console.log(`- ${i.player.name} | Team: ${i.teamName}`);
    });

  } catch (e) {
    console.error(e);
  }
}

test();
