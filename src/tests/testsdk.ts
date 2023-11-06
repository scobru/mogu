import { Mogu } from '../sdk/sdk';

const mogu = new Mogu(undefined, "francos88", "458fe091683c2299eecbfddc07b506478fc0dd22a62ad372", process.env.PINATA_API_KEY, process.env.PINATA_API_SECRET)
async function test() {
    const state = await mogu.load("Qmd3TCPpEvsi4VX9nuTo8asxgNEtDY1RKasvJfpA4AQGq1")
    console.log(state)
}

test()