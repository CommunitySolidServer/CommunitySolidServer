# Testing the server

There are several test sets in place to ensure the server conforms to the necessary requirements,
and to prevent changes from breaking this.

## Unit tests

For every TypeScript file,
most of which correspond to a single class implementation,
there is a corresponding unit test file in the `test/unit` folder.
These tests require 100% code coverage over the corresponding implementation,
making sure every line is checked.

These tests can be run using the `npm run test:unit` script.

## Integration tests

The `test/integration` folder contains several test suites that set up a complete server instance
and validate its functionality.
`test/intergration/config` contains the configurations used by these test suites.
These make sure that no features get lost after changes are made to the server.

These tests can be run using the `npm run test:integration` script.

## Specification conformance

To make sure the server conforms to the Solid specification,
we run the [Conformance Test Harness (CTH)](https://github.com/solid-contrib/conformance-test-harness)
combined with the [specification test suite](https://github.com/solid-contrib/specification-tests/).
This test suite was made specifically so any Solid server can be tested
on how well it conforms to the Solid specifications.
The configuration that runs these tests in the repository can be found [here](https://github.com/CommunitySolidServer/CommunitySolidServer/blob/main/.github/workflows/cth-test.yml).

You can also run this test suite locally.
Besides the standard requirements for running the server,
this also requires Docker.
First make sure you have a running CSS instance,
in this example we will assume it is running at `http://localhost:3000`.
After that you can run the following commands.
The paths are relative to the root folder of your CSS source folder,
and should be adjusted accordingly if you are not running this from the source folder.

```bash
# Generate the folder where the reports will be located
mkdir -p ../conformance/reports/css

# Pull the CTH Docker image
docker pull solidproject/conformance-test-harness

# Set up the env file necessary for the CTH
echo 'SOLID_IDENTITY_PROVIDER=http://localhost:3000/idp/
USERS_ALICE_WEBID=http://localhost:3000/alice/profile/card#me
USERS_BOB_WEBID=http://localhost:3000/bob/profile/card#me
RESOURCE_SERVER_ROOT=http://localhost:3000
TEST_CONTAINER=/alice/
quarkus.log.category."ResultLogger".level=INFO
quarkus.log.category."com.intuit.karate".level=DEBUG
quarkus.log.category."org.solid.testharness.http.Client".level=DEBUG
quarkus.log.category."org.solid.testharness.http.AuthManager".level=DEBUG
MAXTHREADS=1' > ../conformance/conformance.env

# Generate the test users required by the CTH on the server to be tested
npx ts-node test/deploy/createAccountCredentials.ts http://localhost:3000/ >> ../conformance/conformance.env

# Run the CTH
docker run -i --rm \
          -v $(pwd)/../conformance/reports/css:/reports \
          --env-file=../conformance/conformance.env \
          --network="host" \
          solidproject/conformance-test-harness \
          --skip-teardown \
          --output=/reports \
          --target=https://github.com/solid/conformance-test-harness/css
```

When this process is finished you can find the conformance report in the `../reports/css` folder.
