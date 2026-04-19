/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/votex.json`.
 */
export type Votex = {
  address: "HFGLGj86P9gnjLVWnfvoWGjViiEFfwfdQYUtVJ131ZpH";
  metadata: {
    name: "votex";
    version: "0.1.0";
    spec: "0.1.0";
    description: "Created with Anchor";
  };
  instructions: [
    {
      name: "closeCandidate";
      discriminator: [241, 131, 80, 29, 254, 200, 56, 131];
      accounts: [
        {
          name: "creator";
          writable: true;
          signer: true;
        },
        {
          name: "poll";
          pda: {
            seeds: [
              {
                kind: "arg";
                path: "pollId";
              },
            ];
          };
        },
        {
          name: "candidate";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "arg";
                path: "pollId";
              },
              {
                kind: "arg";
                path: "cid";
              },
            ];
          };
        },
      ];
      args: [
        {
          name: "pollId";
          type: "u64";
        },
        {
          name: "cid";
          type: "u64";
        },
      ];
    },
    {
      name: "closePoll";
      discriminator: [139, 213, 162, 65, 172, 150, 123, 67];
      accounts: [
        {
          name: "creator";
          writable: true;
          signer: true;
        },
        {
          name: "poll";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "arg";
                path: "pollId";
              },
            ];
          };
        },
      ];
      args: [
        {
          name: "pollId";
          type: "u64";
        },
      ];
    },
    {
      name: "closeRater";
      discriminator: [237, 186, 180, 42, 159, 178, 195, 204];
      accounts: [
        {
          name: "user";
          writable: true;
          signer: true;
        },
        {
          name: "poll";
          pda: {
            seeds: [
              {
                kind: "arg";
                path: "pollId";
              },
            ];
          };
        },
        {
          name: "rater";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [114, 97, 116, 101, 114];
              },
              {
                kind: "arg";
                path: "pollId";
              },
              {
                kind: "account";
                path: "user";
              },
            ];
          };
        },
      ];
      args: [
        {
          name: "pollId";
          type: "u64";
        },
      ];
    },
    {
      name: "closeRatingResult";
      discriminator: [130, 180, 138, 14, 111, 241, 35, 40];
      accounts: [
        {
          name: "creator";
          writable: true;
          signer: true;
        },
        {
          name: "poll";
          pda: {
            seeds: [
              {
                kind: "arg";
                path: "pollId";
              },
            ];
          };
        },
        {
          name: "ratingResult";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [
                  114,
                  97,
                  116,
                  105,
                  110,
                  103,
                  95,
                  114,
                  101,
                  115,
                  117,
                  108,
                  116,
                ];
              },
              {
                kind: "arg";
                path: "pollId";
              },
              {
                kind: "arg";
                path: "cid";
              },
            ];
          };
        },
      ];
      args: [
        {
          name: "pollId";
          type: "u64";
        },
        {
          name: "cid";
          type: "u64";
        },
      ];
    },
    {
      name: "closeVoter";
      discriminator: [117, 35, 234, 247, 206, 131, 182, 149];
      accounts: [
        {
          name: "user";
          writable: true;
          signer: true;
        },
        {
          name: "poll";
          pda: {
            seeds: [
              {
                kind: "arg";
                path: "pollId";
              },
            ];
          };
        },
        {
          name: "voter";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [118, 111, 116, 101, 114];
              },
              {
                kind: "arg";
                path: "pollId";
              },
              {
                kind: "account";
                path: "user";
              },
            ];
          };
        },
      ];
      args: [
        {
          name: "pollId";
          type: "u64";
        },
      ];
    },
    {
      name: "commitEligibility";
      discriminator: [88, 192, 66, 188, 114, 131, 131, 109];
      accounts: [
        {
          name: "user";
          writable: true;
          signer: true;
        },
        {
          name: "poll";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "arg";
                path: "pollId";
              },
            ];
          };
        },
      ];
      args: [
        {
          name: "pollId";
          type: "u64";
        },
        {
          name: "merkleRoot";
          type: {
            array: ["u8", 32];
          };
        },
        {
          name: "listHash";
          type: {
            array: ["u8", 32];
          };
        },
        {
          name: "contentCid";
          type: "string";
        },
        {
          name: "committedVoterCount";
          type: "u64";
        },
      ];
    },
    {
      name: "createPoll";
      discriminator: [182, 171, 112, 238, 6, 219, 14, 110];
      accounts: [
        {
          name: "user";
          writable: true;
          signer: true;
        },
        {
          name: "poll";
          writable: true;
        },
        {
          name: "counter";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [99, 111, 117, 110, 116, 101, 114];
              },
            ];
          };
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        },
      ];
      args: [
        {
          name: "registrationEnd";
          type: "u64";
        },
        {
          name: "votingStart";
          type: "u64";
        },
        {
          name: "votingEnd";
          type: "u64";
        },
        {
          name: "kind";
          type: {
            defined: {
              name: "pollKind";
            };
          };
        },
        {
          name: "accessMode";
          type: {
            defined: {
              name: "accessMode";
            };
          };
        },
        {
          name: "metadataUri";
          type: "string";
        },
      ];
    },
    {
      name: "initialize";
      discriminator: [175, 175, 109, 31, 13, 152, 155, 237];
      accounts: [
        {
          name: "user";
          writable: true;
          signer: true;
        },
        {
          name: "counter";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [99, 111, 117, 110, 116, 101, 114];
              },
            ];
          };
        },
        {
          name: "registrations";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [
                  114,
                  101,
                  103,
                  105,
                  115,
                  116,
                  114,
                  97,
                  116,
                  105,
                  111,
                  110,
                  115,
                ];
              },
            ];
          };
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        },
      ];
      args: [];
    },
    {
      name: "rateCandidate";
      discriminator: [23, 56, 4, 242, 90, 61, 245, 153];
      accounts: [
        {
          name: "user";
          writable: true;
          signer: true;
        },
        {
          name: "poll";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "arg";
                path: "pollId";
              },
            ];
          };
        },
        {
          name: "candidate";
          pda: {
            seeds: [
              {
                kind: "arg";
                path: "pollId";
              },
              {
                kind: "arg";
                path: "cid";
              },
            ];
          };
        },
        {
          name: "rater";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [114, 97, 116, 101, 114];
              },
              {
                kind: "arg";
                path: "pollId";
              },
              {
                kind: "account";
                path: "user";
              },
            ];
          };
        },
        {
          name: "ratingResult";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [
                  114,
                  97,
                  116,
                  105,
                  110,
                  103,
                  95,
                  114,
                  101,
                  115,
                  117,
                  108,
                  116,
                ];
              },
              {
                kind: "arg";
                path: "pollId";
              },
              {
                kind: "arg";
                path: "cid";
              },
            ];
          };
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        },
      ];
      args: [
        {
          name: "pollId";
          type: "u64";
        },
        {
          name: "cid";
          type: "u64";
        },
        {
          name: "score";
          type: "u8";
        },
        {
          name: "proof";
          type: {
            vec: {
              array: ["u8", 32];
            };
          };
        },
      ];
    },
    {
      name: "registerCandidate";
      discriminator: [91, 136, 96, 222, 242, 4, 160, 182];
      accounts: [
        {
          name: "user";
          writable: true;
          signer: true;
        },
        {
          name: "poll";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "arg";
                path: "pollId";
              },
            ];
          };
        },
        {
          name: "candidate";
          writable: true;
        },
        {
          name: "ratingResult";
          writable: true;
        },
        {
          name: "registrations";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [
                  114,
                  101,
                  103,
                  105,
                  115,
                  116,
                  114,
                  97,
                  116,
                  105,
                  111,
                  110,
                  115,
                ];
              },
            ];
          };
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        },
      ];
      args: [
        {
          name: "pollId";
          type: "u64";
        },
        {
          name: "name";
          type: "string";
        },
      ];
    },
    {
      name: "vote";
      discriminator: [227, 110, 155, 23, 136, 126, 172, 25];
      accounts: [
        {
          name: "user";
          writable: true;
          signer: true;
        },
        {
          name: "poll";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "arg";
                path: "pollId";
              },
            ];
          };
        },
        {
          name: "candidate";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "arg";
                path: "pollId";
              },
              {
                kind: "arg";
                path: "cid";
              },
            ];
          };
        },
        {
          name: "voter";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [118, 111, 116, 101, 114];
              },
              {
                kind: "arg";
                path: "pollId";
              },
              {
                kind: "account";
                path: "user";
              },
            ];
          };
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        },
      ];
      args: [
        {
          name: "pollId";
          type: "u64";
        },
        {
          name: "cid";
          type: "u64";
        },
        {
          name: "proof";
          type: {
            vec: {
              array: ["u8", 32];
            };
          };
        },
      ];
    },
  ];
  accounts: [
    {
      name: "candidate";
      discriminator: [86, 69, 250, 96, 193, 10, 222, 123];
    },
    {
      name: "counter";
      discriminator: [255, 176, 4, 245, 188, 253, 124, 25];
    },
    {
      name: "poll";
      discriminator: [110, 234, 167, 188, 231, 136, 153, 111];
    },
    {
      name: "rater";
      discriminator: [162, 144, 243, 145, 21, 54, 164, 226];
    },
    {
      name: "ratingResult";
      discriminator: [93, 176, 150, 100, 161, 152, 76, 63];
    },
    {
      name: "registrations";
      discriminator: [40, 229, 184, 221, 85, 252, 121, 32];
    },
    {
      name: "voter";
      discriminator: [241, 93, 35, 191, 254, 147, 17, 202];
    },
  ];
  events: [
    {
      name: "ratingCast";
      discriminator: [116, 123, 183, 148, 32, 54, 229, 212];
    },
  ];
  errors: [
    {
      code: 6000;
      name: "invalidTimeWindows";
      msg: "Invalid time windows: registration_end must be before voting_start and voting_start before voting_end";
    },
    {
      code: 6001;
      name: "metadataUriTooLong";
      msg: "metadata_uri exceeds max length (60)";
    },
    {
      code: 6002;
      name: "contentCidTooLong";
      msg: "content_cid exceeds max length (60)";
    },
    {
      code: 6003;
      name: "candidateNameTooLong";
      msg: "candidate name exceeds max length (32)";
    },
    {
      code: 6004;
      name: "pollDoesNotExist";
      msg: "Poll doesn't exist or not found";
    },
    {
      code: 6005;
      name: "candidateAlreadyRegistered";
      msg: "Candidate cannot register twice";
    },
    {
      code: 6006;
      name: "candidateNotRegistered";
      msg: "Candidate is not in the poll";
    },
    {
      code: 6007;
      name: "voterAlreadyVoted";
      msg: "Voter cannot vote twice";
    },
    {
      code: 6008;
      name: "pollNotActive";
      msg: "Voting window is not open";
    },
    {
      code: 6009;
      name: "arithmeticOverflow";
      msg: "Arithmetic overflow";
    },
    {
      code: 6010;
      name: "invalidScore";
      msg: "Score must be between 1 and 5";
    },
    {
      code: 6011;
      name: "judgeAlreadyRated";
      msg: "Judge has already rated this candidate";
    },
    {
      code: 6012;
      name: "notNormalPoll";
      msg: "This instruction is only for normal (single-choice) polls";
    },
    {
      code: 6013;
      name: "notRatingPoll";
      msg: "This instruction is only for rating-based polls";
    },
    {
      code: 6014;
      name: "registrationStillOpen";
      msg: "Registration period has not ended yet";
    },
    {
      code: 6015;
      name: "alreadyFrozen";
      msg: "Poll eligibility has already been committed and frozen";
    },
    {
      code: 6016;
      name: "invalidMerkleProof";
      msg: "Merkle proof verification failed";
    },
    {
      code: 6017;
      name: "votingNotStarted";
      msg: "Voting has not started yet";
    },
    {
      code: 6018;
      name: "votingEnded";
      msg: "Voting period has ended";
    },
    {
      code: 6019;
      name: "pollNotFrozen";
      msg: "Poll must be frozen before voting can begin";
    },
    {
      code: 6020;
      name: "eligibilityCommitTooLate";
      msg: "Eligibility can no longer be committed after voting has started";
    },
    {
      code: 6021;
      name: "invalidCandidateId";
      msg: "candidate id must be >= 1";
    },
    {
      code: 6022;
      name: "unauthorized";
      msg: "Only the poll creator can perform this action";
    },
    {
      code: 6023;
      name: "pollNotEnded";
      msg: "Poll has not ended yet";
    },
  ];
  types: [
    {
      name: "accessMode";
      type: {
        kind: "enum";
        variants: [
          {
            name: "open";
          },
          {
            name: "merkleRestricted";
          },
        ];
      };
    },
    {
      name: "candidate";
      type: {
        kind: "struct";
        fields: [
          {
            name: "cid";
            type: "u64";
          },
          {
            name: "pollId";
            type: "u64";
          },
          {
            name: "name";
            type: "string";
          },
          {
            name: "votes";
            type: "u64";
          },
          {
            name: "hasRegistered";
            type: "bool";
          },
        ];
      };
    },
    {
      name: "counter";
      type: {
        kind: "struct";
        fields: [
          {
            name: "count";
            type: "u64";
          },
        ];
      };
    },
    {
      name: "poll";
      type: {
        kind: "struct";
        fields: [
          {
            name: "id";
            type: "u64";
          },
          {
            name: "creator";
            type: "pubkey";
          },
          {
            name: "kind";
            type: {
              defined: {
                name: "pollKind";
              };
            };
          },
          {
            name: "accessMode";
            type: {
              defined: {
                name: "accessMode";
              };
            };
          },
          {
            name: "isFrozen";
            type: "bool";
          },
          {
            name: "merkleVersion";
            type: "u8";
          },
          {
            name: "candidates";
            type: "u64";
          },
          {
            name: "committedVoterCount";
            type: "u64";
          },
          {
            name: "registrationEnd";
            type: "u64";
          },
          {
            name: "votingStart";
            type: "u64";
          },
          {
            name: "votingEnd";
            type: "u64";
          },
          {
            name: "commitTime";
            type: "u64";
          },
          {
            name: "merkleRoot";
            type: {
              array: ["u8", 32];
            };
          },
          {
            name: "listHash";
            type: {
              array: ["u8", 32];
            };
          },
          {
            name: "metadataUri";
            type: "string";
          },
          {
            name: "contentCid";
            type: "string";
          },
        ];
      };
    },
    {
      name: "pollKind";
      type: {
        kind: "enum";
        variants: [
          {
            name: "normal";
          },
          {
            name: "rating";
          },
        ];
      };
    },
    {
      name: "rater";
      type: {
        kind: "struct";
        fields: [
          {
            name: "ratedMask";
            type: {
              array: ["u64", 4];
            };
          },
        ];
      };
    },
    {
      name: "ratingCast";
      type: {
        kind: "struct";
        fields: [
          {
            name: "pollId";
            type: "u64";
          },
          {
            name: "candidateId";
            type: "u64";
          },
          {
            name: "judge";
            type: "pubkey";
          },
          {
            name: "score";
            type: "u8";
          },
          {
            name: "slot";
            type: "u64";
          },
        ];
      };
    },
    {
      name: "ratingResult";
      type: {
        kind: "struct";
        fields: [
          {
            name: "pollId";
            type: "u64";
          },
          {
            name: "candidateId";
            type: "u64";
          },
          {
            name: "totalScore";
            type: "u64";
          },
          {
            name: "voteCount";
            type: "u64";
          },
        ];
      };
    },
    {
      name: "registrations";
      type: {
        kind: "struct";
        fields: [
          {
            name: "count";
            type: "u64";
          },
        ];
      };
    },
    {
      name: "voter";
      type: {
        kind: "struct";
        fields: [
          {
            name: "cid";
            type: "u64";
          },
          {
            name: "pollId";
            type: "u64";
          },
          {
            name: "hasVoted";
            type: "bool";
          },
        ];
      };
    },
  ];
};
