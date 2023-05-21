#include <stdio.h>

void thru(int value0, int value1, int value2, int value3, int value4) {
  if (value0 > 0) {
    printf("Branch Found -> %d\n", 0);
    if (value1 > 0) {
      printf("Branch Found -> %d\n", 1);
      if (value2 > 0) {
        printf("Branch Found -> %d\n", 2);
        if (value3 > 0) {
          printf("Branch Found -> %d\n", 3);
          if (value4 > 0) {
            printf("Branch Found -> %d\n", 4);
          } else {
            printf("Branch Found -> %d\n", 5);
          }
        } else {
          printf("Branch Found -> %d\n", 6);
          if (value4 > 0) {
            printf("Branch Found -> %d\n", 7);
          } else {
            printf("Branch Found -> %d\n", 8);
          }
        }
      } else {
        printf("Branch Found -> %d\n", 9);
        if (value3 > 0) {
          printf("Branch Found -> %d\n", 10);
          if (value4 > 0) {
            printf("Branch Found -> %d\n", 11);
          } else {
            printf("Branch Found -> %d\n", 12);
          }
        } else {
          printf("Branch Found -> %d\n", 13);
          if (value4 > 0) {
            printf("Branch Found -> %d\n", 14);
          } else {
            printf("Branch Found -> %d\n", 15);
          }
        }
      }
    } else {
      printf("Branch Found -> %d\n", 16);
      if (value2 > 0) {
        printf("Branch Found -> %d\n", 17);
        if (value3 > 0) {
          printf("Branch Found -> %d\n", 18);
          if (value4 > 0) {
            printf("Branch Found -> %d\n", 19);
          } else {
            printf("Branch Found -> %d\n", 20);
          }
        } else {
          printf("Branch Found -> %d\n", 21);
          if (value4 > 0) {
            printf("Branch Found -> %d\n", 22);
          } else {
            printf("Branch Found -> %d\n", 23);
          }
        }
      } else {
        printf("Branch Found -> %d\n", 24);
        if (value3 > 0) {
          printf("Branch Found -> %d\n", 25);
          if (value4 > 0) {
            printf("Branch Found -> %d\n", 26);
          } else {
            printf("Branch Found -> %d\n", 27);
          }
        } else {
          printf("Branch Found -> %d\n", 28);
          if (value4 > 0) {
            printf("Branch Found -> %d\n", 29);
          } else {
            printf("Branch Found -> %d\n", 30);
          }
        }
      }
    }
  } else {
    printf("Branch Found -> %d\n", 31);
    if (value1 > 0) {
      printf("Branch Found -> %d\n", 32);
      if (value2 > 0) {
        printf("Branch Found -> %d\n", 33);
        if (value3 > 0) {
          printf("Branch Found -> %d\n", 34);
          if (value4 > 0) {
            printf("Branch Found -> %d\n", 35);
          } else {
            printf("Branch Found -> %d\n", 36);
          }
        } else {
          printf("Branch Found -> %d\n", 37);
          if (value4 > 0) {
            printf("Branch Found -> %d\n", 38);
          } else {
            printf("Branch Found -> %d\n", 39);
          }
        }
      } else {
        printf("Branch Found -> %d\n", 40);
        if (value3 > 0) {
          printf("Branch Found -> %d\n", 41);
          if (value4 > 0) {
            printf("Branch Found -> %d\n", 42);
          } else {
            printf("Branch Found -> %d\n", 43);
          }
        } else {
          printf("Branch Found -> %d\n", 44);
          if (value4 > 0) {
            printf("Branch Found -> %d\n", 45);
          } else {
            printf("Branch Found -> %d\n", 46);
          }
        }
      }
    } else {
      printf("Branch Found -> %d\n", 47);
      if (value2 > 0) {
        printf("Branch Found -> %d\n", 48);
        if (value3 > 0) {
          printf("Branch Found -> %d\n", 49);
          if (value4 > 0) {
            printf("Branch Found -> %d\n", 50);
          } else {
            printf("Branch Found -> %d\n", 51);
          }
        } else {
          printf("Branch Found -> %d\n", 52);
          if (value4 > 0) {
            printf("Branch Found -> %d\n", 53);
          } else {
            printf("Branch Found -> %d\n", 54);
          }
        }
      } else {
        printf("Branch Found -> %d\n", 55);
        if (value3 > 0) {
          printf("Branch Found -> %d\n", 56);
          if (value4 > 0) {
            printf("Branch Found -> %d\n", 57);
          } else {
            printf("Branch Found -> %d\n", 58);
          }
        } else {
          printf("Branch Found -> %d\n", 59);
          if (value4 > 0) {
            printf("Branch Found -> %d\n", 60);
          } else {
            printf("Branch Found -> %d\n", 61);
          }
        }
      }
    }
  }
}

int value0, value1, value2, value3, value4;

extern "C" int LLVMFuzzerTestOneInput(const char *Data, size_t Size) {
  if (Size < 4) {
    return 0;
  }

  int i = 0;
  while ((i * 2) < Size) {
    int action = Data[i * 2] % 6;
    switch (action) {
    case 0:
      value0 = Data[i * 2 + 1];
      break;
    case 1:
      value1 = Data[i * 2 + 1];
      break;
    case 2:
      value2 = Data[i * 2 + 1];
      break;

    case 3:
      value3 = Data[i * 2 + 1];
      break;
    case 4:
      value4 = Data[i * 2 + 1];
      break;
    case 5:
      thru(value0, value1, value2, value3, value4);
    }
    i++;
  }
  return 0;
}
