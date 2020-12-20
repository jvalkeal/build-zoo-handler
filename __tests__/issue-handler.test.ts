import nock from 'nock';
import lodash from 'lodash';
import * as core from '@actions/core';
import * as github from '@actions/github';
import * as issueHandler from '../src/issue-handler';
// import * as issueHandler from 'issue-handler';

const originalGitHubWorkspace = process.env['GITHUB_WORKSPACE'];
const originalGitHubRepository = process.env['GITHUB_REPOSITORY'];
let originalContext = {...github.context};
let inputs = {} as any;

describe('issue handler tests', () => {
  beforeAll(async () => {
    jest.spyOn(core, 'getInput').mockImplementation((name: string) => {
      return inputs[name];
    });
  }, 300000);

  beforeEach(() => {
    inputs = {};
    nock.cleanAll();
  });

  afterAll(async () => {
    delete process.env['GITHUB_WORKSPACE'];
    if (originalGitHubWorkspace) {
      process.env['GITHUB_WORKSPACE'] = originalGitHubWorkspace;
    }
    delete process.env['GITHUB_REPOSITORY'];
    if (originalGitHubRepository) {
      process.env['GITHUB_REPOSITORY'] = originalGitHubRepository;
    }

    github.context.ref = originalContext.ref;
    github.context.sha = originalContext.sha;

    jest.restoreAllMocks();
  }, 100000);

  it('Create issue from when label added', async () => {
    process.env['GITHUB_REPOSITORY'] = 'owner/repo';

    github.context.eventName = 'issues';
    github.context.payload.issue = {
      number: 1,
      labels: [
        {
          name: 'label1'
        },
        {
          name: 'label2'
        }
      ]
    };

    // check that handler makes request with correct title and body
    nock('https://api.github.com')
      .persist()
      .post('/repos/owner/repo/issues', body => {
        console.log('xxx', body);
        return lodash.isMatch(body, {
          title: 'title',
          body: 'body'
        });
      })
      .reply(201);

    const config = `
      {
        "actions": [
          {
            "type": "ifThen",
            "if": "hasLabels(['label1'])",
            "then": "createIssue()"
          }
        ]
      }
    `;

    await issueHandler.handleIssue('token', config);

    if (!nock.isDone()) {
      throw new Error('Not all nock interceptors were used!');
    }
  }, 100000);
});
