import 'package:rxdart/rxdart.dart';
import 'package:squazzle/data/data.dart';

class HomeRepo {
  final LoginProvider _loginProvider;
  final SharedPrefsProvider _prefsProvider;

  HomeRepo(this._loginProvider, this._prefsProvider);

  Observable<void> loginWithGoogle() =>
      Observable.fromFuture(_loginProvider.loginWithGoogle()).map((user) {
        _prefsProvider.storeUser(user.displayName, user.uid, user.photoUrl);
      }).handleError((e) {
        print(e);
        throw e;
      });

  Observable<User> checkIfLoggedIn() =>
      Observable.fromFuture(_prefsProvider.getUser()).handleError((e) {
        print(e);
        throw e;
      });

  Observable<bool> isFirstOpen() =>
      Observable.fromFuture(_prefsProvider.isFirstOpen()).handleError((e) {
        print(e);
        throw e;
      });
}