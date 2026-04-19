import { hash } from "@node-rs/argon2";

async function main() {
  const password = process.argv[2];
  if (!password) {
    console.error("Usage: npm run hash:password -- '<plain-password>'");
    process.exit(1);
  }

  const hashed = await hash(password, {
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });

  console.log(hashed);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
